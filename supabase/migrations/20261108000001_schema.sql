-- =====================================================================
-- Tribuna Socialista — esquema principal
-- Tabelas, tipos, gatilhos e funções auxiliares.
-- As políticas de acesso (RLS) estão na migração seguinte.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'editor', 'colunista');
create type public.article_status as enum ('draft', 'published', 'scheduled', 'archived');

-- ---------------------------------------------------------------------
-- Lista autorizada: única fonte de verdade sobre quem acessa o /admin
-- e com qual papel. Remover o e-mail daqui revoga o acesso na hora.
-- ---------------------------------------------------------------------
create table public.allowed_emails (
  email       text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role        public.user_role not null default 'colunista',
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Perfis (uma linha por conta que já entrou no sistema)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Autores / colunistas (assinatura pública). Pode ou não estar ligado
-- a uma conta: colunistas convidados não precisam fazer login.
-- ---------------------------------------------------------------------
create table public.authors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  bio         text,
  avatar_url  text,
  is_columnist boolean not null default false,
  profile_id  uuid unique references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Matérias
-- ---------------------------------------------------------------------
create table public.articles (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default '',
  subtitle        text not null default '',          -- linha fina
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt         text not null default '',          -- resumo para redes sociais
  content_json    jsonb,
  content_html    text not null default '',
  cover_url       text,
  cover_alt       text not null default '',
  cover_caption   text not null default '',
  cover_credit    text not null default '',
  status          public.article_status not null default 'draft',
  published_at    timestamptz,
  scheduled_at    timestamptz,
  featured        boolean not null default false,     -- manchete principal
  pinned          boolean not null default false,     -- fixar na home
  section_id      uuid references public.sections (id) on delete set null,
  author_id       uuid references public.authors (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  views           integer not null default 0,
  reading_minutes integer not null default 1,
  search          tsvector,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint scheduled_needs_date check (status <> 'scheduled' or scheduled_at is not null),
  constraint published_needs_date check (status not in ('published', 'scheduled') or published_at is not null)
);

create index articles_public_idx on public.articles (status, published_at desc);
create index articles_section_idx on public.articles (section_id, published_at desc);
create index articles_author_idx on public.articles (author_id, published_at desc);
create index articles_created_by_idx on public.articles (created_by);
create index articles_search_idx on public.articles using gin (search);
create index articles_views_idx on public.articles (views desc);

create table public.article_tags (
  article_id  uuid not null references public.articles (id) on delete cascade,
  tag_id      uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);
create index article_tags_tag_idx on public.article_tags (tag_id);

-- ---------------------------------------------------------------------
-- Biblioteca de mídia
-- ---------------------------------------------------------------------
create table public.media (
  id           uuid primary key default gen_random_uuid(),
  path         text not null unique,
  url          text not null,
  alt          text not null default '',
  caption      text not null default '',
  credit       text not null default '',
  width        integer,
  height       integer,
  size_bytes   integer,
  mime_type    text,
  uploaded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Páginas institucionais (Sobre, Contato, Expediente, Privacidade)
-- ---------------------------------------------------------------------
create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null,
  content_json jsonb,
  content_html text not null default '',
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------
create table public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Funções auxiliares de autorização
-- security definer + search_path fixo: leem a lista autorizada sem
-- depender das políticas da própria tabela.
-- =====================================================================
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select a.role
  from public.allowed_emails a
  where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.current_user_role() is not null $$;

create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() in ('admin', 'editor'), false) $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() = 'admin', false) $$;

-- =====================================================================
-- Gatilhos
-- =====================================================================

-- Atualiza updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

-- Cria o perfil quando alguém entra pela primeira vez
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Índice de busca (português, sem acentos)
create or replace function public.articles_search_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.search :=
    setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.subtitle, ''))), 'B') ||
    setweight(to_tsvector('portuguese', extensions.unaccent(
      regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', ' ', 'g'))), 'C');
  return new;
end $$;

create trigger articles_search before insert or update of title, subtitle, content_html on public.articles
  for each row execute function public.articles_search_update();

-- Regras de publicação aplicadas no banco (valem mesmo chamando a API direto)
create or replace function public.articles_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role := public.current_user_role();
begin
  -- Chamadas internas (service role, cron, seed) não têm usuário no JWT:
  -- pulam a checagem de papel, mas seguem as regras de datas abaixo.
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
    elsif new.created_by is distinct from old.created_by then
      raise exception 'Não é permitido transferir a autoria do texto.' using errcode = '42501';
    end if;
    new.published_at := null;
    new.scheduled_at := null;
  end if;

  -- Coerência de datas por estado
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

create trigger articles_guard before insert or update on public.articles
  for each row execute function public.articles_guard();

-- Só uma manchete principal por vez
create or replace function public.articles_single_featured()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.featured then
    update public.articles set featured = false where featured and id <> new.id;
  end if;
  return new;
end $$;

create trigger articles_single_featured after insert or update of featured on public.articles
  for each row when (new.featured) execute function public.articles_single_featured();

-- Impede ficar sem nenhum administrador
create or replace function public.allowed_emails_keep_admin()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'admin')
     or (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    if (select count(*) from public.allowed_emails where role = 'admin' and email <> old.email) = 0 then
      raise exception 'É preciso manter pelo menos um administrador.' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger allowed_emails_keep_admin before update or delete on public.allowed_emails
  for each row execute function public.allowed_emails_keep_admin();

-- =====================================================================
-- Funções públicas (RPC)
-- =====================================================================

-- Contador de leituras: só incrementa matérias visíveis ao público.
create or replace function public.increment_views(article_id uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.articles
  set views = views + 1
  where id = article_id
    and status in ('published', 'scheduled')
    and published_at <= now();
$$;

-- Busca em texto completo (respeita RLS: security invoker)
create or replace function public.search_articles(q text)
returns setof public.articles
language sql stable security invoker set search_path = ''
as $$
  select a.*
  from public.articles a
  where a.search @@ websearch_to_tsquery('portuguese', extensions.unaccent(q))
  order by ts_rank(a.search, websearch_to_tsquery('portuguese', extensions.unaccent(q))) desc,
           a.published_at desc
$$;

-- Passa para "publicado" os agendados cuja hora chegou (rodado pelo pg_cron).
-- A visibilidade pública já depende de published_at <= now(), então o site
-- mostra o texto na hora certa mesmo se o cron atrasar.
create or replace function public.publish_due_articles()
returns integer language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  update public.articles
  set status = 'published'
  where status = 'scheduled' and scheduled_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;
