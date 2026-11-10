-- =====================================================================
-- Tribuna Socialista — revisão geral (09/11/2026)
--
--   1. Acesso revogado: a assinatura sai de Autores e de Colunistas
--      (nome, foto, biografia, página pessoal e textos continuam no ar)
--   2. Regras de publicação reforçadas no banco
--      - manchete principal e fixação na home: só o administrador
--      - ninguém mexe no contador de leituras pela API
--      - a data de publicação não pode ser inventada (antedatada)
--      - o endereço (URL) de um texto que já foi ao ar não muda mais,
--        salvo pelo administrador
--   3. Leituras: no máximo uma por leitor, por texto, por dia (o "Mais
--      lidas" não pode mais ser inflado repetindo o pedido)
--   4. "Atualizado em" deixa de mudar a cada leitura
--   5. Coluna: só quem ainda tem acesso ao painel edita a própria coluna
--   6. Tetos contra abuso nos formulários públicos
--   7. Desempenho: regras de acesso avaliadas uma vez por consulta (e não
--      uma vez por linha) e índices para as listas do painel
--
-- Pode ser rodada mais de uma vez sem problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Acesso revogado
-- ---------------------------------------------------------------------
alter table public.authors add column if not exists revoked_at timestamptz;

-- Colunista não altera a própria situação (tipo, endereço, conta, revogação)
create or replace function public.authors_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_editor() then
    if new.is_columnist is distinct from old.is_columnist
       or new.is_contributor is distinct from old.is_contributor
       or new.slug is distinct from old.slug
       or new.profile_id is distinct from old.profile_id
       or new.revoked_at is distinct from old.revoked_at then
      raise exception 'Só a edição pode alterar o tipo, o endereço ou a conta de um autor.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Saiu de Usuários: some de Autores e de Colunistas
create or replace function public.allowed_emails_revoke_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.authors a
     set revoked_at = coalesce(a.revoked_at, now()),
         is_columnist = false
    from public.profiles p
   where p.id = a.profile_id
     and lower(p.email) = lower(old.email);
  return old;
end $$;

drop trigger if exists allowed_emails_revoke_author on public.allowed_emails;
create trigger allowed_emails_revoke_author after delete on public.allowed_emails
  for each row execute function public.allowed_emails_revoke_author();

-- Voltou a ter acesso: volta para Autores (e, se colunista ou coordenador,
-- para Colunistas, pelo gatilho que já existia)
create or replace function public.allowed_emails_restore_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.authors a
     set revoked_at = null
    from public.profiles p
   where p.id = a.profile_id
     and lower(p.email) = lower(new.email)
     and a.revoked_at is not null;
  return new;
end $$;

drop trigger if exists allowed_emails_restore_author on public.allowed_emails;
create trigger allowed_emails_restore_author after insert on public.allowed_emails
  for each row execute function public.allowed_emails_restore_author();

-- Quem já tinha sido removido antes desta migração
update public.authors a
   set revoked_at = coalesce(a.revoked_at, now()),
       is_columnist = false
  from public.profiles p
 where p.id = a.profile_id
   and not exists (select 1 from public.allowed_emails e where e.email = lower(p.email));

-- ---------------------------------------------------------------------
-- 2. Regras de publicação
-- ---------------------------------------------------------------------
alter table public.articles add column if not exists first_published_at timestamptz;

create or replace function public.articles_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role := public.current_user_role();
  staff boolean := auth.uid() is not null;
begin
  if staff and r is null then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  if staff and r = 'colunista' then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from old.created_by then
      raise exception 'Não é permitido transferir a autoria do texto.' using errcode = '42501';
    end if;
    if new.author_id is not null
       and (tg_op = 'INSERT' or new.author_id is distinct from old.author_id)
       and not exists (select 1 from public.authors a where a.id = new.author_id and a.profile_id = auth.uid()) then
      raise exception 'Colunistas só podem assinar com o próprio nome.' using errcode = '42501';
    end if;
  end if;

  -- Coordenação e colunistas (todos, menos o administrador)
  if staff and r <> 'admin' then
    if tg_op = 'INSERT' then
      new.featured := false;
      new.pinned := false;
      new.views := 0;
      new.first_published_at := null;
    else
      -- Destaques da capa: decisão do administrador
      new.featured := old.featured;
      new.pinned := old.pinned;
      -- O contador de leituras só muda pelas leituras
      new.views := old.views;
      -- Endereço de texto que já foi ao ar não muda (links já divulgados)
      if old.first_published_at is not null then
        new.slug := old.slug;
      end if;
      -- Data de publicação: a original (republicação) ou agora
      if new.status = 'published' then
        new.published_at := case when old.status = 'published' then old.published_at else now() end;
      end if;
    end if;
    -- Agendamento só para o futuro (senão viraria uma forma de antedatar)
    if new.status = 'scheduled'
       and (tg_op = 'INSERT' or old.status <> 'scheduled' or new.scheduled_at is distinct from old.scheduled_at)
       and new.scheduled_at <= now() then
      raise exception 'A data do agendamento precisa estar no futuro.' using errcode = '23514';
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

  -- Primeira vez no ar: guardada para sempre (o endereço passa a ser fixo)
  if tg_op = 'UPDATE' and old.first_published_at is not null then
    new.first_published_at := old.first_published_at;
  end if;
  if new.first_published_at is null and new.status in ('published', 'scheduled') then
    new.first_published_at := coalesce(new.published_at, now());
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------
-- 4. "Atualizado em" só muda quando o texto muda (não a cada leitura)
-- ---------------------------------------------------------------------
create or replace function public.articles_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'views' - 'updated_at' - 'search') is distinct from (to_jsonb(old) - 'views' - 'updated_at' - 'search') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.articles_touch_updated_at();

-- Textos que já foram ao ar antes desta migração (sem disparar os gatilhos,
-- para não mexer em "Atualizado em")
alter table public.articles disable trigger articles_touch;
alter table public.articles disable trigger articles_guard;
update public.articles
   set first_published_at = coalesce(published_at, created_at)
 where first_published_at is null
   and status in ('published', 'scheduled', 'archived');
alter table public.articles enable trigger articles_guard;
alter table public.articles enable trigger articles_touch;

-- ---------------------------------------------------------------------
-- 3. Leituras: uma por leitor, por texto, por dia
-- O leitor é um resumo irreversível (feito no servidor do site) que muda
-- todo dia; as marcas são apagadas depois de dois dias.
-- ---------------------------------------------------------------------
create table if not exists public.article_view_hits (
  article_id uuid not null references public.articles (id) on delete cascade,
  visitor    text not null check (visitor ~ '^[0-9a-f]{16,64}$'),
  day        date not null default current_date,
  primary key (article_id, visitor, day)
);
create index if not exists article_view_hits_day_idx on public.article_view_hits (day);
alter table public.article_view_hits enable row level security;
revoke all on public.article_view_hits from anon, authenticated;

create or replace function public.register_view(p_article uuid, p_visitor text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{16,64}$' then
    return false;
  end if;
  if not exists (
    select 1 from public.articles
     where id = p_article and status in ('published', 'scheduled') and published_at <= now()
  ) then
    return false;
  end if;
  insert into public.article_view_hits (article_id, visitor) values (p_article, p_visitor)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  update public.articles set views = views + 1 where id = p_article;
  if random() < 0.02 then
    delete from public.article_view_hits where day < current_date - 1;
  end if;
  return true;
end $$;

revoke execute on function public.register_view(uuid, text) from public, anon, authenticated;
grant execute on function public.register_view(uuid, text) to service_role;

-- O contador antigo ficava aberto a qualquer visitante (dava para inflar o
-- "Mais lidas" chamando a função em repetição). Agora só o servidor do site conta.
revoke execute on function public.increment_views(uuid) from public, anon, authenticated;
grant execute on function public.increment_views(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 5 e 7. Regras de acesso: avaliadas uma vez por consulta
-- (select f()) vira um valor calculado uma vez; f() sozinho era chamado
-- para cada linha da tabela.
-- ---------------------------------------------------------------------
drop policy if exists "editor lê todas" on public.articles;
create policy "editor lê todas" on public.articles
  for select to authenticated using ((select public.is_editor()));

drop policy if exists "colunista lê as próprias" on public.articles;
create policy "colunista lê as próprias" on public.articles
  for select to authenticated using ((select public.is_staff()) and created_by = (select auth.uid()));

drop policy if exists "editor cria" on public.articles;
create policy "editor cria" on public.articles
  for insert to authenticated with check ((select public.is_editor()));

drop policy if exists "colunista cria rascunho" on public.articles;
create policy "colunista cria rascunho" on public.articles
  for insert to authenticated
  with check ((select public.is_staff()) and status = 'draft' and created_by = (select auth.uid()));

drop policy if exists "editor edita qualquer texto" on public.articles;
create policy "editor edita qualquer texto" on public.articles
  for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));

drop policy if exists "colunista edita o próprio texto" on public.articles;
create policy "colunista edita o próprio texto" on public.articles
  for update to authenticated
  using ((select public.is_staff()) and created_by = (select auth.uid()))
  with check ((select public.is_staff()) and created_by = (select auth.uid()));

drop policy if exists "editor apaga" on public.articles;
create policy "editor apaga" on public.articles
  for delete to authenticated using ((select public.is_editor()));

drop policy if exists "colunista apaga o próprio rascunho" on public.articles;
create policy "colunista apaga o próprio rascunho" on public.articles
  for delete to authenticated
  using ((select public.is_staff()) and created_by = (select auth.uid()) and status = 'draft');

drop policy if exists "editor ou o próprio colunista edita autor" on public.authors;
create policy "editor ou o próprio colunista edita autor" on public.authors for update to authenticated
  using ((select public.is_editor()) or (profile_id = (select auth.uid()) and (select public.is_staff())))
  with check ((select public.is_editor()) or (profile_id = (select auth.uid()) and (select public.is_staff())));

drop policy if exists "coordenacao gerencia colunas" on public.columns;
create policy "coordenacao gerencia colunas" on public.columns
  for all to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));

-- Antes, quem tinha o acesso removido mas ainda guardava a sessão no
-- navegador podia renomear a própria coluna pela API.
drop policy if exists "colunista gerencia a propria coluna" on public.columns;
create policy "colunista gerencia a propria coluna" on public.columns
  for all to authenticated
  using ((select public.is_staff()) and exists (select 1 from public.authors a where a.id = author_id and a.profile_id = (select auth.uid())))
  with check ((select public.is_staff()) and exists (select 1 from public.authors a where a.id = author_id and a.profile_id = (select auth.uid())));

drop policy if exists "equipe envia mídia" on public.media;
create policy "equipe envia mídia" on public.media
  for insert to authenticated with check ((select public.is_staff()) and uploaded_by = (select auth.uid()));
drop policy if exists "editor ou dono edita mídia" on public.media;
create policy "editor ou dono edita mídia" on public.media
  for update to authenticated
  using ((select public.is_editor()) or ((select public.is_staff()) and uploaded_by = (select auth.uid())))
  with check ((select public.is_editor()) or ((select public.is_staff()) and uploaded_by = (select auth.uid())));
drop policy if exists "editor ou dono apaga mídia" on public.media;
create policy "editor ou dono apaga mídia" on public.media
  for delete to authenticated
  using ((select public.is_editor()) or ((select public.is_staff()) and uploaded_by = (select auth.uid())));

-- Índices para as listas do painel e da biblioteca de imagens
create index if not exists articles_updated_idx on public.articles (updated_at desc);
create index if not exists articles_featured_idx on public.articles (published_at desc) where featured;
create index if not exists articles_pinned_idx on public.articles (published_at desc) where pinned;
create index if not exists media_created_idx on public.media (created_at desc);
create index if not exists submissions_created_idx on public.submissions (created_at desc);
create index if not exists subscribers_created_idx on public.subscribers (created_at desc);
create index if not exists subscribers_confirm_sent_idx on public.subscribers (confirm_sent_at) where confirm_sent_at is not null;

-- ---------------------------------------------------------------------
-- 6. Tetos contra abuso nos formulários públicos (somando todos os
--    remetentes; o limite por e-mail continua valendo)
-- ---------------------------------------------------------------------
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
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Muitas mensagens seguidas. Tente de novo mais tarde.' using errcode = '54000';
  end if;
  return new;
end $$;

create or replace function public.submissions_rate_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.created_at := now();
  if (select count(*) from public.submissions
      where email = new.email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Muitos envios seguidos. Tente de novo mais tarde.' using errcode = '54000';
  end if;
  if (select count(*) from public.submissions where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Muitos envios seguidos. Tente de novo mais tarde.' using errcode = '54000';
  end if;
  return new;
end $$;

-- Assinaturas criadas direto pela API (sem passar pelo site)
create or replace function public.subscribers_rate_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', 'anon') in ('anon', 'authenticated')
     and (select count(*) from public.subscribers where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'Muitas assinaturas seguidas. Tente de novo mais tarde.' using errcode = '54000';
  end if;
  return new;
end $$;

drop trigger if exists subscribers_rate_limit on public.subscribers;
create trigger subscribers_rate_limit before insert on public.subscribers
  for each row execute function public.subscribers_rate_limit();

-- Arquivos enviados por visitantes (bucket privado "envios"): no máximo 80
-- por hora, somando todos. Sem isso, um robô poderia encher o armazenamento.
create or replace function public.envios_uploads_last_hour()
returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::int from storage.objects
   where bucket_id = 'envios' and created_at > now() - interval '1 hour'
$$;
revoke execute on function public.envios_uploads_last_hour() from public;
grant execute on function public.envios_uploads_last_hour() to anon, authenticated;

drop policy if exists "visitante envia arquivo" on storage.objects;
create policy "visitante envia arquivo" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'envios'
    and name ~ '^recebidos/[0-9a-f-]{36}/(texto\.(pdf|doc|docx)|foto\.(jpg|jpeg|png|webp))$'
    and (select public.envios_uploads_last_hour()) < 80
  );
