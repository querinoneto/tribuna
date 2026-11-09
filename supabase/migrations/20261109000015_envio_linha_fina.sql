-- =====================================================================
-- Tribuna Socialista — envios de leitores: título obrigatório e linha
-- fina opcional
-- =====================================================================
alter table public.submissions
  add column if not exists subtitle text not null default '' check (length(subtitle) <= 300);

-- Título obrigatório nos novos envios (os antigos não são verificados)
alter table public.submissions drop constraint if exists submissions_title_required;
alter table public.submissions
  add constraint submissions_title_required check (length(trim(title)) > 0) not valid;
