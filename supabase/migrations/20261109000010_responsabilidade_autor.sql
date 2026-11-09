-- =====================================================================
-- Tribuna Socialista — cada autor responde pelo que publica
-- Atualiza o Termo de colaboração (item 7) e a página Sobre.
-- (Se essas páginas já tiverem sido editadas no painel e o trecho não
--  for encontrado, nada muda: ajuste o texto pelo painel, em Páginas.)
-- =====================================================================

update public.pages set
  updated_at = now(),
  content_json = null,
  content_html = replace(
    content_html,
    $old$<h2>7. Responsabilidade pelo conteúdo</h2>
<p>As opiniões expressas na Obra são de responsabilidade do Colaborador e não representam necessariamente a posição da Tribuna Socialista. O Colaborador responde pela veracidade das declarações feitas no item 1. Se elas forem falsas e a Tribuna Socialista for responsabilizada por violação de direitos de terceiros, o Colaborador deverá ressarcir os prejuízos daí decorrentes, nos limites da lei.</p>$old$,
    $new$<h2>7. Responsabilidade do autor pelo conteúdo</h2>
<p>O Colaborador é o <strong>responsável pelo conteúdo da Obra</strong>: pelas opiniões, informações, dados, citações e afirmações nela contidas, respondendo por eles nas esferas civil e criminal, nos termos da lei. As opiniões expressas na Obra são do autor e não representam necessariamente a posição da Tribuna Socialista, o que será indicado junto ao texto publicado.</p>
<p>A avaliação, a edição autorizada no item 4 e a publicação pela equipe editorial não transferem ao jornal a autoria nem a responsabilidade pelas afirmações do Colaborador.</p>
<p>Se a Tribuna Socialista for chamada a responder, judicial ou extrajudicialmente, por conteúdo da Obra, o Colaborador deverá colaborar com a defesa, fornecendo informações e documentos, e ressarcir os valores que o jornal tiver de pagar em razão desse conteúdo, inclusive custas e honorários, ficando assegurado ao jornal o direito de regresso. Essa obrigação não se aplica a trechos acrescentados ou alterados pela equipe em desacordo com o item 4.</p>$new$
  )
where slug = 'termos-de-colaboracao';

update public.pages set
  updated_at = now(),
  content_json = null,
  content_html = replace(
    content_html,
    $old$<li><p><strong>Respeito aos leitores.</strong>$old$,
    $new$<li><p><strong>Cada autor responde pelo que escreve.</strong> Textos assinados por colunistas e colaboradores expressam a opinião de quem os assina, que é responsável por seu conteúdo, e não necessariamente a posição do jornal.</p></li>
<li><p><strong>Respeito aos leitores.</strong>$new$
  )
where slug = 'sobre';
