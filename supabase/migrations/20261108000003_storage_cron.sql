-- =====================================================================
-- Tribuna Socialista — Storage (imagens) e agendamento
-- =====================================================================

-- Bucket público de imagens: até 5 MB, apenas formatos de imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "equipe envia imagens" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());

create policy "editor ou dono altera imagens" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (public.is_editor() or owner_id = auth.uid()::text))
  with check (bucket_id = 'media' and (public.is_editor() or owner_id = auth.uid()::text));

create policy "editor ou dono apaga imagens" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (public.is_editor() or owner_id = auth.uid()::text));

-- ---------------------------------------------------------------------
-- Agendamento: a cada minuto, marca como publicados os textos agendados
-- cuja hora chegou. Requer a extensão pg_cron (disponível no Supabase:
-- Database → Extensions → pg_cron). Se ela não estiver disponível, o
-- site continua mostrando os agendados na hora certa, porque a leitura
-- pública já filtra por published_at <= now().
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('tribuna-publicar-agendados', '* * * * *', 'select public.publish_due_articles()');
  else
    raise notice 'pg_cron indisponível: agendamento segue funcionando pela data de publicação.';
  end if;
end $$;
