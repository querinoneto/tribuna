-- =====================================================================
-- Tribuna Socialista — dados iniciais
-- Administrador inicial, editorias, páginas
-- institucionais e 3 matérias de exemplo (podem ser apagadas no painel).
-- =====================================================================

insert into public.allowed_emails (email, role)
values ('querino.neto@gmail.com', 'admin')
on conflict (email) do update set role = 'admin';

insert into public.sections (name, slug, position, description) values
  ('Política',      'politica',      1, 'Poder, instituições e disputa democrática.'),
  ('Economia',      'economia',      2, 'Renda, emprego, orçamento e desigualdade.'),
  ('Trabalho',      'trabalho',      3, 'Quem trabalha, como trabalha e o que reivindica.'),
  ('Meio Ambiente', 'meio-ambiente', 4, 'Clima, território, água e justiça ambiental.'),
  ('Cultura',       'cultura',       5, 'Arte, cultura popular e memória.'),
  ('Internacional', 'internacional', 6, 'O mundo visto do Sul.'),
  ('Opinião',       'opiniao',       7, 'Colunas e artigos assinados.')
on conflict (slug) do nothing;

-- Páginas institucionais (edite pelo painel em /admin/paginas)
insert into public.pages (slug, title, content_html, content_json) values
  ('sobre', 'Sobre',
   '<p>A Tribuna Socialista é um jornal digital independente. Este texto é provisório: edite-o no painel, em Páginas.</p>',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A Tribuna Socialista é um jornal digital independente. Este texto é provisório: edite-o no painel, em Páginas."}]}]}'),
  ('contato', 'Contato',
   '<p>Para falar com a redação, informe aqui o e-mail e os canais de contato do jornal.</p>',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Para falar com a redação, informe aqui o e-mail e os canais de contato do jornal."}]}]}'),
  ('expediente', 'Expediente',
   '<p>Informe aqui a equipe responsável pelo jornal: direção, edição e reportagem.</p>',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Informe aqui a equipe responsável pelo jornal: direção, edição e reportagem."}]}]}'),
  ('privacidade', 'Política de privacidade',
   '<p>Este site coleta apenas o e-mail de quem se inscreve na newsletter, usado exclusivamente para o envio do boletim. Você pode pedir a remoção a qualquer momento pelos canais de contato. Revise este texto com orientação jurídica antes de publicar.</p>',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Este site coleta apenas o e-mail de quem se inscreve na newsletter, usado exclusivamente para o envio do boletim. Você pode pedir a remoção a qualquer momento pelos canais de contato. Revise este texto com orientação jurídica antes de publicar."}]}]}')
on conflict (slug) do nothing;

-- Três matérias de exemplo (sem autor: escolha um no painel antes de republicar)
with s as (select id, slug from public.sections),
     a as (select null::uuid as id)
insert into public.articles
  (title, subtitle, slug, excerpt, content_html, content_json, status, published_at, featured, section_id, author_id, reading_minutes, cover_alt)
values
(
  'Entregadores param as capitais e cobram piso por hora rodada',
  'Paralisação começou no Nordeste e reabre o debate sobre vínculo, jornada e a caixa-preta dos algoritmos.',
  'entregadores-param-as-capitais',
  'Entregadores por aplicativo cruzam os braços e pedem remuneração mínima por hora rodada.',
  '<p>Esta é uma matéria de exemplo. A paralisação dos entregadores por aplicativo entrou no segundo dia com adesão em várias capitais. Os trabalhadores pedem um valor mínimo por hora efetivamente rodada.</p><h2>O algoritmo como chefe</h2><p>Pesquisadores do trabalho apontam que a gestão automatizada concentra decisões que caberiam a um supervisor identificável.</p><blockquote><p>A gente não quer favor. Quer saber quanto vale a hora de quem carrega a cidade nas costas.</p></blockquote><p>Apague este texto quando publicar as primeiras matérias reais.</p>',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Esta é uma matéria de exemplo. A paralisação dos entregadores por aplicativo entrou no segundo dia com adesão em várias capitais. Os trabalhadores pedem um valor mínimo por hora efetivamente rodada."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"O algoritmo como chefe"}]},{"type":"paragraph","content":[{"type":"text","text":"Pesquisadores do trabalho apontam que a gestão automatizada concentra decisões que caberiam a um supervisor identificável."}]},{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"A gente não quer favor. Quer saber quanto vale a hora de quem carrega a cidade nas costas."}]}]},{"type":"paragraph","content":[{"type":"text","text":"Apague este texto quando publicar as primeiras matérias reais."}]}]}',
  'published', now() - interval '2 hours', true,
  (select id from s where slug = 'trabalho'), (select id from a), 2, ''
),
(
  'Professores da rede estadual aprovam estado de greve',
  'Categoria reivindica cumprimento do piso nacional e revisão do plano de carreira.',
  'professores-aprovam-estado-de-greve',
  'Professores dão prazo ao governo para apresentar proposta sobre piso e carreira.',
  '<p>Esta é uma matéria de exemplo. Em assembleia, professores da rede estadual aprovaram estado de greve e deram prazo para o governo apresentar proposta.</p><p>A pauta inclui o pagamento integral do piso nacional e a realização de concurso público.</p>',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Esta é uma matéria de exemplo. Em assembleia, professores da rede estadual aprovaram estado de greve e deram prazo para o governo apresentar proposta."}]},{"type":"paragraph","content":[{"type":"text","text":"A pauta inclui o pagamento integral do piso nacional e a realização de concurso público."}]}]}',
  'published', now() - interval '5 hours', false,
  (select id from s where slug = 'trabalho'), (select id from a), 1, ''
),
(
  'Ribeirinhos cobram plano de recuperação para o São Francisco',
  'Pescadores e agricultores relatam perda de renda com a redução da vazão do rio.',
  'ribeirinhos-cobram-plano-para-o-sao-francisco',
  'Comunidades do Baixo São Francisco cobram plano de recuperação do rio.',
  '<p>Esta é uma matéria de exemplo. Comunidades ribeirinhas do Baixo São Francisco cobram um plano de recuperação do rio e participação nas decisões sobre o uso da água.</p><ul><li>Redução da pesca artesanal</li><li>Avanço da cunha salina na foz</li><li>Perda de áreas de cultivo</li></ul>',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Esta é uma matéria de exemplo. Comunidades ribeirinhas do Baixo São Francisco cobram um plano de recuperação do rio e participação nas decisões sobre o uso da água."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Redução da pesca artesanal"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Avanço da cunha salina na foz"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Perda de áreas de cultivo"}]}]}]}]}',
  'published', now() - interval '1 day', false,
  (select id from s where slug = 'meio-ambiente'), (select id from a), 1, ''
)
on conflict (slug) do nothing;
