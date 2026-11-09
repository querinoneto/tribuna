-- =====================================================================
-- Tribuna Socialista — colunista publica direto; perfis; coordenação
--   1. Colunista publica, agenda e tira do ar os próprios textos
--      (a revisão pela coordenação deixa de ser obrigatória)
--   2. Coordenação lê e marca as mensagens do Contato (só o
--      administrador apaga)
--   3. Coordenadores também ganham assinatura automática; qualquer pessoa
--      da equipe cria a própria assinatura para editar foto, nome e bio
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Publicação pelo colunista
-- ---------------------------------------------------------------------
update public.articles set in_review = false where in_review;

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
    -- Destaques da capa continuam sendo decisão da coordenação
    if tg_op = 'INSERT' then
      if new.featured or new.pinned then
        raise exception 'Colunistas não podem destacar textos na home.' using errcode = '42501';
      end if;
      new.created_by := auth.uid();
    else
      if new.created_by is distinct from old.created_by then
        raise exception 'Não é permitido transferir a autoria do texto.' using errcode = '42501';
      end if;
      if (new.featured and not old.featured) or (new.pinned and not old.pinned) then
        raise exception 'Colunistas não podem destacar textos na home.' using errcode = '42501';
      end if;
    end if;
    if new.author_id is not null
       and (tg_op = 'INSERT' or new.author_id is distinct from old.author_id)
       and not exists (select 1 from public.authors a where a.id = new.author_id and a.profile_id = auth.uid()) then
      raise exception 'Colunistas só podem assinar com o próprio nome.' using errcode = '42501';
    end if;
  end if;

  -- A revisão obrigatória foi desativada
  new.in_review := false;

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
    new.published_at := null;
  end if;

  return new;
end $$;

-- Colunista edita (e publica, agenda, arquiva) os próprios textos
drop policy if exists "colunista edita o próprio rascunho" on public.articles;
drop policy if exists "colunista edita o próprio texto" on public.articles;
create policy "colunista edita o próprio texto" on public.articles
  for update to authenticated
  using (public.is_staff() and created_by = auth.uid())
  with check (public.is_staff() and created_by = auth.uid());

-- Apagar continua valendo só para o próprio rascunho
drop policy if exists "colunista apaga o próprio rascunho" on public.articles;
create policy "colunista apaga o próprio rascunho" on public.articles
  for delete to authenticated
  using (public.is_staff() and created_by = auth.uid() and status = 'draft');

drop function if exists public.withdraw_review(uuid);

-- ---------------------------------------------------------------------
-- 2. Contato: coordenação lê e marca; só o administrador apaga
-- ---------------------------------------------------------------------
drop policy if exists "admin lê contato" on public.contact_messages;
drop policy if exists "coordenação lê contato" on public.contact_messages;
create policy "coordenação lê contato" on public.contact_messages
  for select to authenticated using (public.is_editor());

drop policy if exists "admin marca contato" on public.contact_messages;
drop policy if exists "coordenação marca contato" on public.contact_messages;
create policy "coordenação marca contato" on public.contact_messages
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- (a política "admin apaga contato" continua: só o administrador apaga)

-- ---------------------------------------------------------------------
-- 3. Assinaturas
--    Colunistas e coordenadores ganham a assinatura (como colunistas)
--    ao entrar; qualquer pessoa da equipe pode criar a própria pela
--    página "Meu perfil".
-- ---------------------------------------------------------------------
create or replace function public.ensure_staff_author(p_profile uuid, p_columnist boolean)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  p record;
  existing uuid;
  base text;
  candidate text;
  n int := 1;
  new_id uuid;
begin
  select id, name, email, avatar_url into p from public.profiles where id = p_profile;
  if not found then return null; end if;

  select id into existing from public.authors where profile_id = p.id;
  if existing is not null then
    if p_columnist then
      update public.authors set is_columnist = true, is_contributor = false where id = existing;
    end if;
    return existing;
  end if;

  base := public.author_slug(coalesce(nullif(trim(p.name), ''), split_part(p.email, '@', 1)));
  candidate := base;
  while exists (select 1 from public.authors where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  insert into public.authors (name, slug, avatar_url, is_columnist, is_contributor, profile_id)
  values (coalesce(nullif(trim(p.name), ''), split_part(p.email, '@', 1)), candidate, p.avatar_url, p_columnist, false, p.id)
  returning id into new_id;
  return new_id;
end $$;

revoke execute on function public.ensure_staff_author(uuid, boolean) from public, anon, authenticated;

-- Mantém o nome antigo funcionando (usado pela migração anterior)
create or replace function public.ensure_columnist_author(p_profile uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.ensure_staff_author(p_profile, true);
end $$;
revoke execute on function public.ensure_columnist_author(uuid) from public, anon, authenticated;

create or replace function public.profiles_columnist_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.allowed_emails where email = lower(new.email) and role in ('colunista', 'editor')) then
    perform public.ensure_staff_author(new.id, true);
  end if;
  return new;
end $$;

create or replace function public.allowed_emails_columnist_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  pid uuid;
begin
  if new.role in ('colunista', 'editor') then
    select id into pid from public.profiles where email = lower(new.email);
    if pid is not null then
      perform public.ensure_staff_author(pid, true);
    end if;
  end if;
  return new;
end $$;

-- Coordenadores que já entraram antes desta mudança
select public.ensure_staff_author(p.id, true)
from public.profiles p
join public.allowed_emails a on a.email = lower(p.email)
where a.role in ('colunista', 'editor');

-- "Meu perfil": devolve (ou cria) a assinatura de quem está logado
create or replace function public.ensure_my_author()
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role := public.current_user_role();
begin
  if r is null then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  return public.ensure_staff_author(auth.uid(), r in ('colunista', 'editor'));
end $$;

revoke execute on function public.ensure_my_author() from public, anon;
grant execute on function public.ensure_my_author() to authenticated;
