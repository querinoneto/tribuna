-- Tribuna Socialista — colunas com nome próprio
--
-- Um colunista pode (opcionalmente) dar nome à sua coluna, como
-- "Domingo no Parque". O nome não substitui o do colunista: a assinatura
-- continua sendo do autor. Textos marcados como da coluna podem dispensar
-- a editoria.

create table if not exists public.columns (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null unique references public.authors (id) on delete cascade,
  name        text not null check (length(trim(name)) between 2 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (description is null or length(description) <= 280),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.columns enable row level security;

drop policy if exists "colunas sao publicas" on public.columns;
create policy "colunas sao publicas" on public.columns for select using (true);

-- Coordenação gerencia qualquer coluna; o colunista, a própria
drop policy if exists "coordenacao gerencia colunas" on public.columns;
create policy "coordenacao gerencia colunas" on public.columns
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "colunista gerencia a propria coluna" on public.columns;
create policy "colunista gerencia a propria coluna" on public.columns
  for all to authenticated
  using (exists (select 1 from public.authors a where a.id = author_id and a.profile_id = auth.uid()))
  with check (exists (select 1 from public.authors a where a.id = author_id and a.profile_id = auth.uid()));

grant select on public.columns to anon, authenticated;
grant insert, update, delete on public.columns to authenticated;

-- Texto ligado a uma coluna
alter table public.articles add column if not exists column_id uuid references public.columns (id) on delete set null;
create index if not exists articles_column_idx on public.articles (column_id, published_at desc);

-- A coluna precisa ser do próprio autor do texto
create or replace function public.articles_column_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.column_id is not null and not exists (
    select 1 from public.columns c where c.id = new.column_id and c.author_id = new.author_id
  ) then
    raise exception 'O texto só pode entrar na coluna do próprio autor.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists articles_column_guard on public.articles;
create trigger articles_column_guard
  before insert or update of column_id, author_id on public.articles
  for each row execute function public.articles_column_guard();
