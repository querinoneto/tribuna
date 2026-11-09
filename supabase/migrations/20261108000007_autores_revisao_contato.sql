-- =====================================================================
-- Tribuna Socialista — autores, revisão de textos e contato
--   1. Remove as tags
--   2. Fluxo de revisão: colunista envia o texto para a coordenação
--   3. Colunista convidado ganha a assinatura (autor) automaticamente
--   4. Mensagens do formulário de contato (só o administrador lê)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tags: deixam de existir
-- ---------------------------------------------------------------------
drop table if exists public.article_tags;
drop table if exists public.tags;

-- ---------------------------------------------------------------------
-- 2. Revisão
--    in_review     o texto está com a coordenação, aguardando revisão
--    submitted_at  última vez em que o colunista enviou para revisão
--    review_note   recado da coordenação ao devolver o texto
-- ---------------------------------------------------------------------
alter table public.articles
  add column if not exists in_review boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists review_note text not null default '';

alter table public.articles drop constraint if exists review_only_drafts;
alter table public.articles
  add constraint review_only_drafts check (not in_review or status = 'draft');

create index if not exists articles_review_idx on public.articles (in_review) where in_review;

create or replace function public.articles_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role := public.current_user_role();
begin
  if auth.uid() is not null and r is null then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  if auth.uid() is not null and r = 'colunista' then
    if new.status <> 'draft' then
      raise exception 'Colunistas não podem publicar, agendar ou arquivar textos.' using errcode = '42501';
    end if;
    if new.featured or new.pinned then
      raise exception 'Colunistas não podem destacar textos na home.' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.in_review := false;
      new.submitted_at := null;
      new.review_note := '';
    else
      if new.created_by is distinct from old.created_by then
        raise exception 'Não é permitido transferir a autoria do texto.' using errcode = '42501';
      end if;
      -- O recado é da coordenação; a data de envio é carimbada aqui
      new.review_note := old.review_note;
      new.submitted_at := old.submitted_at;
      if new.in_review and not old.in_review then
        new.submitted_at := now();
        new.review_note := '';
      end if;
    end if;
    if new.author_id is not null
       and (tg_op = 'INSERT' or new.author_id is distinct from old.author_id)
       and not exists (select 1 from public.authors a where a.id = new.author_id and a.profile_id = auth.uid()) then
      raise exception 'Colunistas só podem assinar com o próprio nome.' using errcode = '42501';
    end if;
    new.published_at := null;
    new.scheduled_at := null;
  end if;

  -- Publicado, agendado ou arquivado: a revisão terminou
  if new.status <> 'draft' then
    new.in_review := false;
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'scheduled' then
    if new.scheduled_at is null then
      raise exception 'Informe a data e a hora do agendamento.' using errcode = '23514';
    end if;
    new.published_at := new.scheduled_at;
  end if;
  if new.status = 'draft' then
    new.scheduled_at := null;
  end if;

  return new;
end $$;

-- Colunista edita e apaga o próprio rascunho só enquanto ele não está em revisão
drop policy if exists "colunista edita o próprio rascunho" on public.articles;
create policy "colunista edita o próprio rascunho" on public.articles
  for update to authenticated
  using (public.is_staff() and created_by = auth.uid() and status = 'draft' and not in_review)
  with check (public.is_staff() and created_by = auth.uid() and status = 'draft');

drop policy if exists "colunista apaga o próprio rascunho" on public.articles;
create policy "colunista apaga o próprio rascunho" on public.articles
  for delete to authenticated
  using (public.is_staff() and created_by = auth.uid() and status = 'draft' and not in_review);

-- Colunista pode retirar o próprio texto da revisão para continuar escrevendo
create or replace function public.withdraw_review(p_article uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if public.current_user_role() is null then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  update public.articles
     set in_review = false
   where id = p_article
     and in_review
     and status = 'draft'
     and (created_by = auth.uid() or public.is_editor());
  return found;
end $$;

revoke execute on function public.withdraw_review(uuid) from public, anon;
grant execute on function public.withdraw_review(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Colunista convidado na área Usuários recebe a assinatura sozinho
-- ---------------------------------------------------------------------
create or replace function public.author_slug(p_name text)
returns text language sql immutable set search_path = ''
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_name, ''))), '[^a-z0-9]+', '-', 'g')), ''), 'autor')
$$;

create or replace function public.ensure_columnist_author(p_profile uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  p record;
  base text;
  candidate text;
  n int := 1;
begin
  select id, name, email, avatar_url into p from public.profiles where id = p_profile;
  if not found then return; end if;

  if exists (select 1 from public.authors where profile_id = p.id) then
    update public.authors set is_columnist = true, is_contributor = false where profile_id = p.id;
    return;
  end if;

  base := public.author_slug(coalesce(nullif(trim(p.name), ''), split_part(p.email, '@', 1)));
  candidate := base;
  while exists (select 1 from public.authors where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  insert into public.authors (name, slug, avatar_url, is_columnist, is_contributor, profile_id)
  values (coalesce(nullif(trim(p.name), ''), split_part(p.email, '@', 1)), candidate, p.avatar_url, true, false, p.id);
end $$;

revoke execute on function public.ensure_columnist_author(uuid) from public, anon, authenticated;

-- Quando a pessoa entra pela primeira vez
create or replace function public.profiles_columnist_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.allowed_emails where email = lower(new.email) and role = 'colunista') then
    perform public.ensure_columnist_author(new.id);
  end if;
  return new;
end $$;

drop trigger if exists profiles_columnist_author on public.profiles;
create trigger profiles_columnist_author after insert on public.profiles
  for each row execute function public.profiles_columnist_author();

-- Quando o administrador convida ou muda o papel de alguém que já entrou
create or replace function public.allowed_emails_columnist_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  pid uuid;
begin
  if new.role = 'colunista' then
    select id into pid from public.profiles where email = lower(new.email);
    if pid is not null then
      perform public.ensure_columnist_author(pid);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists allowed_emails_columnist_author on public.allowed_emails;
create trigger allowed_emails_columnist_author after insert or update of role on public.allowed_emails
  for each row execute function public.allowed_emails_columnist_author();

-- Colunistas que já entraram antes desta mudança
select public.ensure_columnist_author(p.id)
from public.profiles p
join public.allowed_emails a on a.email = lower(p.email)
where a.role = 'colunista';

-- ---------------------------------------------------------------------
-- 4. Contato
-- ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null check (length(trim(first_name)) between 1 and 80),
  last_name   text not null check (length(trim(last_name)) between 1 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  message     text not null check (length(trim(message)) between 1 and 5000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "qualquer um escreve" on public.contact_messages;
create policy "qualquer um escreve" on public.contact_messages
  for insert to anon, authenticated
  with check (read_at is null);

drop policy if exists "admin lê contato" on public.contact_messages;
create policy "admin lê contato" on public.contact_messages
  for select to authenticated using (public.is_admin());

drop policy if exists "admin marca contato" on public.contact_messages;
create policy "admin marca contato" on public.contact_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin apaga contato" on public.contact_messages;
create policy "admin apaga contato" on public.contact_messages
  for delete to authenticated using (public.is_admin());

-- Contra abuso: no máximo 5 mensagens por e-mail a cada hora
create or replace function public.contact_rate_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.email := lower(trim(new.email));
  new.created_at := now();
  if (select count(*) from public.contact_messages
      where email = new.email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Muitas mensagens seguidas. Tente de novo mais tarde.' using errcode = '54000';
  end if;
  return new;
end $$;

drop trigger if exists contact_rate_limit on public.contact_messages;
create trigger contact_rate_limit before insert on public.contact_messages
  for each row execute function public.contact_rate_limit();
