-- Tribuna Socialista — publicação automática do card no Instagram
--
-- instagram_config: uma única linha com o token da conta e o liga/desliga.
--   Sem políticas RLS: só o servidor (chave secreta) lê e grava. O token
--   nunca chega ao navegador.
-- instagram_posts: um registro por texto enviado ao Instagram (garante que
--   cada texto seja postado uma só vez). A coordenação pode consultar.

create table if not exists public.instagram_config (
  id                  boolean primary key default true check (id),
  enabled             boolean not null default false,
  access_token        text,
  ig_user_id          text,
  username            text,
  token_refreshed_at  timestamptz,
  enabled_at          timestamptz,
  updated_at          timestamptz not null default now()
);
alter table public.instagram_config enable row level security;
revoke all on public.instagram_config from anon, authenticated;

create table if not exists public.instagram_posts (
  article_id  uuid primary key references public.articles (id) on delete cascade,
  status      text not null default 'processando' check (status in ('processando', 'publicado', 'erro')),
  media_id    text,
  permalink   text,
  error       text,
  attempts    integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists instagram_posts_created_idx on public.instagram_posts (created_at desc);
alter table public.instagram_posts enable row level security;

drop policy if exists "coordenacao le instagram" on public.instagram_posts;
create policy "coordenacao le instagram" on public.instagram_posts
  for select to authenticated using (public.is_editor());
