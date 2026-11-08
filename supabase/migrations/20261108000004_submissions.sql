-- =====================================================================
-- Tribuna Socialista — "Escreva e publique conosco"
-- Qualquer visitante envia um texto (PDF ou Word) e, se for a primeira
-- vez, uma foto. Só editores e administradores leem os envios.
-- =====================================================================

create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) between 2 and 120),
  email           text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  title           text not null default '' check (length(title) <= 200),
  message         text not null default '' check (length(message) <= 2000),
  first_time      boolean not null default true,
  file_path       text not null check (file_path ~ '^recebidos/[0-9a-f-]{36}/texto\.(pdf|doc|docx)$'),
  file_name       text not null default '' check (length(file_name) <= 200),
  photo_path      text check (photo_path ~ '^recebidos/[0-9a-f-]{36}/foto\.(jpg|jpeg|png|webp)$'),
  status          text not null default 'novo' check (status in ('novo', 'lido', 'arquivado')),
  created_at      timestamptz not null default now(),
  constraint photo_for_first_time check (not first_time or photo_path is not null)
);

create index submissions_status_idx on public.submissions (status, created_at desc);

alter table public.submissions enable row level security;

-- Visitantes só podem criar envios novos (nunca ler, editar ou apagar)
create policy "qualquer um envia texto" on public.submissions
  for insert to anon, authenticated
  with check (status = 'novo');

create policy "editor lê envios" on public.submissions
  for select to authenticated using (public.is_editor());
create policy "editor marca envios" on public.submissions
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editor apaga envios" on public.submissions
  for delete to authenticated using (public.is_editor());

-- Contra abuso: no máximo 5 envios por e-mail a cada hora
create or replace function public.submissions_rate_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.submissions
      where email = new.email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Muitos envios seguidos. Tente de novo mais tarde.' using errcode = '54000';
  end if;
  return new;
end $$;

create trigger submissions_rate_limit before insert on public.submissions
  for each row execute function public.submissions_rate_limit();

-- ---------------------------------------------------------------------
-- Arquivos: bucket PRIVADO "envios" (até 10 MB; PDF, Word e imagens).
-- Visitantes só conseguem enviar para a pasta recebidos/<id>/; ninguém
-- além da equipe de edição consegue baixar.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'envios', 'envios', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "visitante envia arquivo" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'envios'
    and name ~ '^recebidos/[0-9a-f-]{36}/(texto\.(pdf|doc|docx)|foto\.(jpg|jpeg|png|webp))$'
  );

create policy "editor baixa arquivo enviado" on storage.objects
  for select to authenticated
  using (bucket_id = 'envios' and public.is_editor());

create policy "editor apaga arquivo enviado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'envios' and public.is_editor());
