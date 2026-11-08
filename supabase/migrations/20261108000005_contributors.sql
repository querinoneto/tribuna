-- =====================================================================
-- Tribuna Socialista — colaboradores
--
-- Quem envia um texto pelo "Escreva e publique conosco" vira
-- COLABORADOR(A): recebe os créditos (nome, foto, mini biografia), mas
-- não entra na lista de colunistas. Colunistas continuam sendo apenas as
-- pessoas cadastradas como tal pela edição.
-- =====================================================================

alter table public.authors
  add column is_contributor boolean not null default false;

alter table public.authors
  add constraint author_kind check (not (is_columnist and is_contributor));

-- Liga cada envio ao colaborador e ao rascunho criados a partir dele
-- (permite reaproveitar o mesmo colaborador quando a pessoa voltar a escrever)
alter table public.submissions
  add column author_id uuid references public.authors (id) on delete set null,
  add column article_id uuid references public.articles (id) on delete set null;

create index submissions_email_idx on public.submissions (email);
