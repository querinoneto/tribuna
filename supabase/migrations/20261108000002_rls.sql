-- =====================================================================
-- Tribuna Socialista — Row Level Security
--
-- Papéis:
--   admin     → tudo, inclusive gerenciar usuários
--   editor    → cria, edita e publica qualquer texto
--   colunista → cria rascunhos e edita só os próprios rascunhos
--   visitante → lê apenas o que está publicado (não precisa de conta)
-- =====================================================================

alter table public.allowed_emails enable row level security;
alter table public.profiles       enable row level security;
alter table public.authors        enable row level security;
alter table public.sections       enable row level security;
alter table public.tags           enable row level security;
alter table public.articles       enable row level security;
alter table public.article_tags   enable row level security;
alter table public.media          enable row level security;
alter table public.pages          enable row level security;
alter table public.subscribers    enable row level security;

-- ---------------------------------------------------------------------
-- allowed_emails: só admin gerencia; cada pessoa pode ver a própria linha
-- ---------------------------------------------------------------------
create policy "admin lê a lista" on public.allowed_emails
  for select to authenticated
  using (public.is_admin() or email = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "admin convida" on public.allowed_emails
  for insert to authenticated with check (public.is_admin());
create policy "admin altera papel" on public.allowed_emails
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin remove" on public.allowed_emails
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "equipe vê perfis" on public.profiles
  for select to authenticated using (public.is_staff() or id = auth.uid());
create policy "cada um edita o próprio perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- authors, sections, tags: leitura pública; edição por editor/admin
-- ---------------------------------------------------------------------
create policy "autores são públicos" on public.authors for select using (true);
create policy "editor cria autor" on public.authors for insert to authenticated with check (public.is_editor());
create policy "editor ou o próprio colunista edita autor" on public.authors for update to authenticated
  using (public.is_editor() or (profile_id = auth.uid() and public.is_staff()))
  with check (public.is_editor() or (profile_id = auth.uid() and public.is_staff()));
create policy "editor remove autor" on public.authors for delete to authenticated using (public.is_editor());

create policy "editorias são públicas" on public.sections for select using (true);
create policy "editor cria editoria" on public.sections for insert to authenticated with check (public.is_editor());
create policy "editor edita editoria" on public.sections for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editor remove editoria" on public.sections for delete to authenticated using (public.is_editor());

create policy "tags são públicas" on public.tags for select using (true);
create policy "equipe cria tag" on public.tags for insert to authenticated with check (public.is_staff());
create policy "editor edita tag" on public.tags for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editor remove tag" on public.tags for delete to authenticated using (public.is_editor());

-- ---------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------
create policy "público lê matérias publicadas" on public.articles
  for select
  using (status in ('published', 'scheduled') and published_at <= now());

create policy "editor lê todas" on public.articles
  for select to authenticated using (public.is_editor());

create policy "colunista lê as próprias" on public.articles
  for select to authenticated using (public.is_staff() and created_by = auth.uid());

create policy "editor cria" on public.articles
  for insert to authenticated with check (public.is_editor());

create policy "colunista cria rascunho" on public.articles
  for insert to authenticated
  with check (public.is_staff() and status = 'draft' and created_by = auth.uid());

create policy "editor edita qualquer texto" on public.articles
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "colunista edita o próprio rascunho" on public.articles
  for update to authenticated
  using (public.is_staff() and created_by = auth.uid() and status = 'draft')
  with check (public.is_staff() and created_by = auth.uid() and status = 'draft');

create policy "editor apaga" on public.articles
  for delete to authenticated using (public.is_editor());

create policy "colunista apaga o próprio rascunho" on public.articles
  for delete to authenticated
  using (public.is_staff() and created_by = auth.uid() and status = 'draft');

-- ---------------------------------------------------------------------
-- article_tags: visível se a matéria for visível; editável por quem
-- pode editar a matéria
-- ---------------------------------------------------------------------
create policy "tags da matéria seguem a matéria" on public.article_tags
  for select using (exists (select 1 from public.articles a where a.id = article_id));

create policy "quem edita a matéria liga tags" on public.article_tags
  for insert to authenticated
  with check (exists (
    select 1 from public.articles a
    where a.id = article_id
      and (public.is_editor() or (public.is_staff() and a.created_by = auth.uid() and a.status = 'draft'))
  ));

create policy "quem edita a matéria desliga tags" on public.article_tags
  for delete to authenticated
  using (exists (
    select 1 from public.articles a
    where a.id = article_id
      and (public.is_editor() or (public.is_staff() and a.created_by = auth.uid() and a.status = 'draft'))
  ));

-- ---------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------
create policy "mídia é pública" on public.media for select using (true);
create policy "equipe envia mídia" on public.media
  for insert to authenticated with check (public.is_staff() and uploaded_by = auth.uid());
create policy "editor ou dono edita mídia" on public.media
  for update to authenticated
  using (public.is_editor() or (public.is_staff() and uploaded_by = auth.uid()))
  with check (public.is_editor() or (public.is_staff() and uploaded_by = auth.uid()));
create policy "editor ou dono apaga mídia" on public.media
  for delete to authenticated
  using (public.is_editor() or (public.is_staff() and uploaded_by = auth.uid()));

-- ---------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------
create policy "páginas são públicas" on public.pages for select using (true);
create policy "editor cria página" on public.pages for insert to authenticated with check (public.is_editor());
create policy "editor edita página" on public.pages for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "admin apaga página" on public.pages for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- subscribers: qualquer visitante se inscreve; só admin vê e exporta
-- ---------------------------------------------------------------------
create policy "qualquer um se inscreve" on public.subscribers for insert to anon, authenticated with check (true);
create policy "admin vê inscritos" on public.subscribers for select to authenticated using (public.is_admin());
create policy "admin remove inscrito" on public.subscribers for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------
revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.increment_views(uuid) to anon, authenticated;
grant execute on function public.search_articles(text) to anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
