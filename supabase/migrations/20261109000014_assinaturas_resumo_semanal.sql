-- =====================================================================
-- Tribuna Socialista — assinaturas com confirmação e resumo semanal
--   1. Assinantes passam a ter situação: pendente (aguardando
--      confirmação por e-mail), ativo ou cancelado
--   2. Registro dos resumos semanais enviados (evita envio duplicado)
-- O envio é feito pelo servidor do site com a chave secreta do Supabase;
-- visitantes só conseguem criar uma assinatura "pendente".
-- =====================================================================

-- Quem assinou antes desta mudança já tinha manifestado consentimento:
-- a coluna nasce com 'ativo' para as linhas existentes e, em seguida,
-- o padrão passa a ser 'pendente' para as novas assinaturas.
alter table public.subscribers
  add column if not exists status text not null default 'ativo',
  add column if not exists confirm_token_hash text,
  add column if not exists confirm_sent_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists synced_at timestamptz;

alter table public.subscribers drop constraint if exists subscribers_status_check;
alter table public.subscribers
  add constraint subscribers_status_check check (status in ('pendente', 'ativo', 'cancelado'));

create unique index if not exists subscribers_token_idx on public.subscribers (confirm_token_hash) where confirm_token_hash is not null;
create index if not exists subscribers_status_idx on public.subscribers (status);

alter table public.subscribers alter column status set default 'pendente';
update public.subscribers set confirmed_at = created_at where status = 'ativo' and confirmed_at is null;

-- Visitante só cria assinatura pendente, sem token e sem datas
drop policy if exists "qualquer um se inscreve" on public.subscribers;
create policy "qualquer um se inscreve" on public.subscribers
  for insert to anon, authenticated
  with check (
    status = 'pendente'
    and confirm_token_hash is null
    and confirm_sent_at is null
    and confirmed_at is null
    and unsubscribed_at is null
    and synced_at is null
  );

-- ---------------------------------------------------------------------
-- Resumos enviados
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_sends (
  id            uuid primary key default gen_random_uuid(),
  week_key      text not null,
  kind          text not null default 'semanal' check (kind in ('semanal', 'manual', 'teste')),
  status        text not null check (status in ('enviado', 'sem-novidades', 'erro')),
  article_count int not null default 0,
  broadcast_id  text,
  error         text,
  created_at    timestamptz not null default now()
);

-- Um resumo semanal automático por semana
create unique index if not exists newsletter_sends_week_idx
  on public.newsletter_sends (week_key) where kind = 'semanal' and status in ('enviado', 'sem-novidades');

alter table public.newsletter_sends enable row level security;

drop policy if exists "admin vê envios" on public.newsletter_sends;
create policy "admin vê envios" on public.newsletter_sends
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Política de Privacidade: dupla confirmação e operador de e-mail
-- (se o texto já tiver sido editado no painel e o trecho não for
--  encontrado, nada muda; ajuste pelo painel, em Páginas)
-- ---------------------------------------------------------------------
update public.pages set
  updated_at = now(),
  content_json = null,
  content_html = replace(replace(replace(
    content_html,
    'com a finalidade exclusiva de remessa do conteúdo editorial do jornal e de comunicações correlatas ao serviço, tendo por fundamento o consentimento do titular (art. 7º, I, da LGPD).</p>',
    'com a finalidade exclusiva de remessa do conteúdo editorial do jornal, na forma de resumo semanal, e de comunicações correlatas ao serviço, tendo por fundamento o consentimento do titular (art. 7º, I, da LGPD).</p>
<p><strong>6.2.2.</strong> A assinatura somente se torna ativa após a confirmação do titular, mediante acesso à ligação enviada ao endereço de correio eletrônico informado (dupla confirmação). Pedidos não confirmados são eliminados no prazo de 30 (trinta) dias.</p>'),
    '(d) prestador de serviço de envio de mensagens eletrônicas, quando utilizado para a remessa de conteúdo aos assinantes.',
    '(d) Resend, Inc., para o envio das mensagens de confirmação de assinatura e do resumo semanal aos assinantes.'),
    '(a) dados de assinantes, até a revogação do consentimento;',
    '(a) dados de assinantes, até a revogação do consentimento, e pedidos de assinatura não confirmados, por até 30 (trinta) dias;')
where slug = 'privacidade';
