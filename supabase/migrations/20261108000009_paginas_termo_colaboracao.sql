-- =====================================================================
-- Tribuna Socialista — textos institucionais e termo de colaboração
--   1. Sobre, Política de privacidade e Contato (texto removido)
--   2. Nova página: Termo de colaboração e licença de direitos autorais
--   3. Envios de leitores passam a registrar o aceite do termo
-- Os textos continuam editáveis no painel, em Páginas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sobre
-- ---------------------------------------------------------------------
update public.pages set
  title = 'Sobre',
  content_json = null,
  updated_at = now(),
  content_html = $html$
<p>A <strong>Tribuna Socialista</strong> é um jornal digital de imprensa popular, feito a serviço da classe trabalhadora brasileira. Nasce da convicção de que a informação é um campo de disputa: quem decide o que vira notícia decide, em boa medida, o que a sociedade enxerga como problema e o que aceita como normal.</p>
<p>A grande imprensa costuma narrar o país a partir dos interesses de quem o controla. A Tribuna Socialista faz o caminho inverso: parte de quem trabalha, de quem mora nas periferias, de quem sustenta a economia e raramente aparece nela como protagonista.</p>
<h2>O que fazemos</h2>
<ul>
<li><p><strong>Notícias e análises</strong> sobre política, economia, trabalho, meio ambiente, cultura e relações internacionais, sempre com atenção aos efeitos concretos de cada decisão sobre a vida do povo.</p></li>
<li><p><strong>Opinião e colunas</strong> de militantes, pesquisadores, trabalhadores e trabalhadoras que disputam o debate público com argumentos.</p></li>
<li><p><strong>Espaço aberto a colaborações:</strong> qualquer pessoa pode enviar um texto pela página <a href="/publique">Escreva e publique conosco</a>. Os textos são avaliados pela nossa equipe e, se aprovados, publicados com o nome de quem escreveu.</p></li>
</ul>
<h2>Nossos compromissos</h2>
<ul>
<li><p><strong>Lado declarado, rigor nos fatos.</strong> Não fingimos neutralidade: temos posição. Por isso mesmo, checamos as informações, citamos fontes e corrigimos com transparência quando erramos.</p></li>
<li><p><strong>Independência.</strong> A linha editorial é definida pela própria equipe, sem subordinação a anunciantes, empresas ou governos.</p></li>
<li><p><strong>Acesso livre.</strong> Todo o conteúdo é gratuito e sem algoritmo decidindo o que você lê.</p></li>
<li><p><strong>Respeito aos leitores.</strong> Coletamos o mínimo de dados pessoais, como explica a nossa <a href="/privacidade">Política de privacidade</a>.</p></li>
</ul>
<p>Assine para receber nosso conteúdo por e-mail, compartilhe os textos e escreva com a gente. Imprensa popular se faz coletivamente.</p>
$html$
where slug = 'sobre';

-- ---------------------------------------------------------------------
-- Contato: o formulário fala por si
-- ---------------------------------------------------------------------
update public.pages set content_html = '', content_json = null, updated_at = now() where slug = 'contato';

-- ---------------------------------------------------------------------
-- Política de privacidade
-- ---------------------------------------------------------------------
update public.pages set
  title = 'Política de privacidade',
  content_json = null,
  updated_at = now(),
  content_html = $html$
<p><em>Versão 1.0 · em vigor desde 8 de novembro de 2026</em></p>
<p>Esta Política explica, de forma clara, quais dados pessoais a <strong>Tribuna Socialista</strong> trata quando você lê, assina, escreve ou entra em contato com o jornal, para que os usa, com quem os compartilha, por quanto tempo os guarda e como você exerce seus direitos. Ela segue a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018, "LGPD"), o Marco Civil da Internet (Lei nº 12.965/2014) e a regulamentação da Autoridade Nacional de Proteção de Dados (ANPD).</p>

<h2>1. Quem é o responsável pelos seus dados</h2>
<p>O controlador dos dados pessoais tratados neste site é a Tribuna Socialista, por meio dos responsáveis indicados na página <a href="/expediente">Expediente</a>. Para qualquer assunto relacionado a esta Política ou aos seus dados, use o canal de atendimento descrito no item 10.</p>

<h2>2. Jornalismo e proteção de dados</h2>
<p>A LGPD não se aplica ao tratamento de dados realizado para fins exclusivamente jornalísticos (art. 4º, II, "a"). Assim, as informações sobre pessoas que aparecem em reportagens, artigos e colunas seguem as regras próprias da atividade de imprensa, protegida pela Constituição Federal (arts. 5º, IV, IX e XIV, e 220). Quem se sentir ofendido por matéria publicada pode exercer o direito de resposta previsto na Lei nº 13.188/2015 pela página <a href="/contato">Contato</a>.</p>
<p>Esta Política trata dos dados das pessoas que <strong>usam</strong> o site: leitores, assinantes, colaboradores, quem nos escreve e a equipe.</p>

<h2>3. Quais dados tratamos e por quê</h2>
<h3>3.1. Ao navegar e ler</h3>
<p>Você não precisa de cadastro para ler o jornal. Não usamos cookies de publicidade, não fazemos perfis de comportamento e não usamos ferramentas de análise de terceiros. Contamos quantas vezes cada matéria é aberta, sem identificar quem leu.</p>
<p>Como em qualquer site, os provedores de hospedagem registram dados técnicos de acesso (endereço IP, data e hora, navegador e página acessada) para garantir o funcionamento e a segurança do serviço e, quando aplicável, cumprir o dever de guarda de registros de acesso do art. 15 do Marco Civil da Internet. Base legal: cumprimento de obrigação legal e legítimo interesse (art. 7º, II e IX, da LGPD).</p>
<p>Se você escolher o tema claro ou escuro, essa preferência fica salva apenas no seu navegador.</p>

<h3>3.2. Ao assinar para receber nosso conteúdo por e-mail</h3>
<p>Tratamos o <strong>e-mail</strong> informado para enviar nossos conteúdos. Base legal: seu consentimento (art. 7º, I), que pode ser revogado a qualquer momento, pelo link de cancelamento das mensagens ou pela página Contato.</p>

<h3>3.3. Ao enviar um texto ("Escreva e publique conosco")</h3>
<p>Tratamos <strong>nome, sobrenome, e-mail, a foto</strong> (na primeira colaboração), o <strong>arquivo do texto</strong> e a <strong>mensagem</strong> que você escrever, além da data, da hora e da versão do termo aceito. Usamos esses dados para avaliar o texto, falar com você e, se ele for publicado, creditar a autoria com seu nome, sua foto e uma breve apresentação. Bases legais: execução do <a href="/termos-de-colaboracao">Termo de colaboração</a> que você aceita ao enviar (art. 7º, V) e exercício regular de direitos (art. 7º, VI).</p>
<p><strong>Atenção:</strong> se o texto for publicado, seu nome, sua foto e sua apresentação ficam públicos junto com ele, inclusive em compartilhamentos e mecanismos de busca.</p>

<h3>3.4. Ao escrever pela página Contato</h3>
<p>Tratamos <strong>nome, sobrenome, e-mail e a mensagem</strong> para responder ao seu pedido. Base legal: procedimentos a pedido do titular e legítimo interesse (art. 7º, V e IX).</p>

<h3>3.5. Equipe do jornal</h3>
<p>Para quem acessa o painel (administração, coordenação e colunistas), tratamos e-mail, nome, foto, papel na equipe e registros das ações no painel, para controlar o acesso e garantir a segurança. Base legal: execução de contrato ou de procedimentos relacionados e legítimo interesse (art. 7º, V e IX). O acesso pode ser feito com a conta Google da pessoa.</p>

<h2>4. O que não fazemos</h2>
<ul>
<li><p>Não vendemos, alugamos nem cedemos dados pessoais.</p></li>
<li><p>Não usamos seus dados para publicidade, nem para tomar decisões automatizadas a seu respeito.</p></li>
<li><p>Não pedimos dados pessoais sensíveis (como saúde, religião ou filiação partidária). Se você incluir esse tipo de informação por conta própria em um texto ou mensagem, ela será tratada só na medida do necessário para a finalidade do envio.</p></li>
</ul>

<h2>5. Com quem compartilhamos</h2>
<p>Usamos fornecedores de tecnologia que tratam dados em nosso nome (operadores), apenas para operar o site:</p>
<ul>
<li><p><strong>Supabase:</strong> banco de dados, armazenamento de arquivos e login da equipe;</p></li>
<li><p><strong>Vercel:</strong> hospedagem e entrega do site;</p></li>
<li><p><strong>Google:</strong> login da equipe com conta Google;</p></li>
<li><p><strong>serviço de envio de e-mails</strong>, quando usado para as assinaturas.</p></li>
</ul>
<p>Quando uma matéria traz vídeo incorporado (por exemplo, do YouTube), a plataforma pode coletar dados ao reproduzi-lo, conforme a política dela. Usamos o modo de privacidade reforçada sempre que disponível.</p>
<p>Também podemos compartilhar dados quando exigido por lei, por ordem judicial ou por autoridade competente, ou para defender direitos do jornal em processos judiciais e administrativos.</p>

<h2>6. Transferência internacional</h2>
<p>Alguns fornecedores podem armazenar dados em servidores fora do Brasil. Nesses casos, a transferência observa o art. 33 da LGPD e a regulamentação da ANPD, com fornecedores que adotam garantias contratuais e técnicas de proteção compatíveis com a lei brasileira.</p>

<h2>7. Por quanto tempo guardamos</h2>
<ul>
<li><p><strong>Assinaturas:</strong> até você cancelar.</p></li>
<li><p><strong>Mensagens de contato:</strong> pelo tempo necessário para responder e por até 2 (dois) anos depois, para histórico e defesa de direitos.</p></li>
<li><p><strong>Textos enviados e não publicados:</strong> até 12 (doze) meses após a avaliação.</p></li>
<li><p><strong>Textos publicados:</strong> o texto, o nome, a foto e a apresentação do autor integram o acervo do jornal por prazo indeterminado, nos termos do Termo de colaboração. Os dados de contato do colaborador e o registro do aceite são guardados enquanto o texto estiver no acervo, para prova da autoria e da licença.</p></li>
<li><p><strong>Registros técnicos de acesso:</strong> pelo prazo legal aplicável, em regra 6 (seis) meses.</p></li>
</ul>
<p>Depois desses prazos, os dados são eliminados ou anonimizados, salvo quando a guarda for exigida por lei ou necessária ao exercício regular de direitos (art. 16 da LGPD).</p>

<h2>8. Segurança</h2>
<p>Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não autorizados e situações acidentais ou ilícitas, como conexão criptografada (HTTPS), controle de acesso por papel na equipe, regras de segurança aplicadas diretamente no banco de dados e armazenamento privado dos arquivos enviados por colaboradores. Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que possa causar risco ou dano relevante, comunicaremos a ANPD e as pessoas afetadas, como determina o art. 48 da LGPD.</p>

<h2>9. Seus direitos</h2>
<p>Nos termos do art. 18 da LGPD, você pode pedir, a qualquer momento:</p>
<ul>
<li><p>confirmação de que tratamos seus dados e acesso a eles;</p></li>
<li><p>correção de dados incompletos, inexatos ou desatualizados;</p></li>
<li><p>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;</p></li>
<li><p>portabilidade, nos termos da regulamentação;</p></li>
<li><p>eliminação dos dados tratados com base no consentimento e informação sobre a possibilidade de não consentir e suas consequências;</p></li>
<li><p>informação sobre com quem compartilhamos seus dados;</p></li>
<li><p>revogação do consentimento.</p></li>
</ul>
<p>Alguns pedidos podem ter limites legais. Por exemplo, a eliminação não alcança dados que devemos guardar por obrigação legal. Também não alcança textos já publicados, que seguem o Termo de colaboração e as regras da atividade jornalística. Você também pode peticionar à ANPD (<a href="https://www.gov.br/anpd">www.gov.br/anpd</a>).</p>

<h2>10. Como falar com a gente</h2>
<p>Use o formulário da página <a href="/contato">Contato</a> e escreva <strong>"Privacidade"</strong> no início da mensagem. Esse é o canal de comunicação com titulares de dados. Para confirmar que o pedido é seu, podemos solicitar informações adicionais. Respondemos em até 15 (quinze) dias, ou no prazo que a regulamentação fixar.</p>

<h2>11. Crianças e adolescentes</h2>
<p>O jornal é aberto a todos os públicos, mas as funções de assinatura, envio de textos e contato são destinadas a maiores de 18 anos. Menores de 18 anos só podem usá-las com autorização e acompanhamento de pais ou responsáveis.</p>

<h2>12. Alterações desta Política</h2>
<p>Esta Política pode ser atualizada para refletir mudanças no site ou na legislação. A versão em vigor é sempre a publicada nesta página, com a data de atualização. Mudanças relevantes serão destacadas no site.</p>

<h2>13. Lei aplicável e foro</h2>
<p>Esta Política é regida pela legislação brasileira. Fica eleito o foro da comarca de Maceió (AL), ressalvadas as hipóteses em que a lei garanta ao titular o foro do próprio domicílio.</p>
$html$
where slug = 'privacidade';

-- ---------------------------------------------------------------------
-- 2. Termo de colaboração
-- ---------------------------------------------------------------------
insert into public.pages (slug, title, content_html, content_json)
values ('termos-de-colaboracao', 'Termo de colaboração e licença de direitos autorais', '', null)
on conflict (slug) do nothing;

update public.pages set
  title = 'Termo de colaboração e licença de direitos autorais',
  content_json = null,
  updated_at = now(),
  content_html = $html$
<p><em>Versão 1.0 · em vigor desde 8 de novembro de 2026</em></p>
<p>Este Termo regula o envio de textos à <strong>Tribuna Socialista</strong> pela página <a href="/publique">Escreva e publique conosco</a>. Ao marcar a caixa de aceite e enviar o texto, você, o <strong>Colaborador</strong>, declara que leu, entendeu e concorda com todas as condições abaixo. O aceite eletrônico tem valor de manifestação escrita de vontade e é registrado com data, hora e versão do Termo.</p>

<h2>1. Declarações do Colaborador</h2>
<p>O Colaborador declara que:</p>
<ol>
<li><p>é o <strong>autor</strong> do texto enviado (a "Obra") e titular de todos os direitos sobre ela, e que a Obra é original. Trechos de terceiros, se houver, estão citados dentro dos limites do art. 46 da Lei nº 9.610/1998, com indicação de autor e fonte;</p></li>
<li><p>a Obra não viola direitos de terceiros, como direitos autorais, direitos de imagem, honra, privacidade, segredo profissional ou obrigações de confidencialidade;</p></li>
<li><p>as informações de fato contidas na Obra são, até onde sabe, verdadeiras;</p></li>
<li><p>a foto enviada é sua e pode ser usada, e os dados informados (nome, sobrenome e e-mail) são verdadeiros;</p></li>
<li><p>é maior de 18 anos ou está autorizado por seus pais ou responsáveis legais a aceitar este Termo.</p></li>
</ol>

<h2>2. Colaboração voluntária e gratuita</h2>
<p>A colaboração é <strong>espontânea, voluntária e inteiramente gratuita</strong>. O Colaborador não receberá remuneração, pagamento, participação em receitas ou qualquer outra contraprestação pela publicação nem por qualquer uso da Obra autorizado neste Termo, e renuncia expressamente a reclamar valores a esse título. Fica afastada, de forma expressa, a presunção de onerosidade prevista no art. 50 da Lei nº 9.610/1998.</p>
<p>O envio não cria vínculo de emprego, de prestação de serviços, societário, associativo ou de qualquer outra natureza entre o Colaborador e a Tribuna Socialista.</p>

<h2>3. Avaliação e decisão editorial</h2>
<p>A Tribuna Socialista não é obrigada a publicar a Obra. A decisão de publicar, o momento, a editoria, o destaque e a forma de apresentação cabem exclusivamente à equipe editorial, que não precisa justificar a recusa. A Tribuna Socialista também pode, a qualquer tempo, retirar a Obra do ar, por decisão editorial, por ordem legal ou judicial ou diante de reclamação fundamentada de terceiros.</p>

<h2>4. Edição autorizada: corrigir e cortar, nunca acrescentar</h2>
<p>O Colaborador autoriza a equipe editorial a, sem necessidade de nova consulta:</p>
<ol>
<li><p><strong>alterar o título e a linha fina</strong> (subtítulo), e incluir intertítulos;</p></li>
<li><p>fazer <strong>correções</strong> ortográficas, gramaticais, de pontuação e de padronização (grafia de nomes, números, siglas e datas, conforme o padrão do jornal);</p></li>
<li><p><strong>suprimir trechos</strong>, para adequar o texto ao espaço, à clareza, à linha editorial ou para evitar riscos jurídicos.</p></li>
</ol>
<p>É <strong>vedado acrescentar</strong> ao corpo da Obra palavras, frases, informações, ideias ou opiniões que não sejam do Colaborador. Título, linha fina, intertítulos, imagens, legendas, destaques e eventuais notas são elementos editoriais de responsabilidade do jornal. Uma nota da redação, quando necessária, será sempre identificada como tal e separada do texto do autor.</p>
<p>Essas intervenções não podem alterar o sentido essencial da Obra. Ficam preservados os direitos morais do autor previstos nos arts. 24 a 27 da Lei nº 9.610/1998, que são inalienáveis e irrenunciáveis, em especial o direito de ter seu nome indicado como autor e o de se opor a modificações que prejudiquem a Obra ou atinjam sua reputação ou honra.</p>

<h2>5. Licença dos direitos de uso</h2>
<p>O Colaborador concede à Tribuna Socialista, nos termos dos arts. 29 e 49 da Lei nº 9.610/1998, <strong>licença de uso da Obra</strong>, com as seguintes condições:</p>
<ul>
<li><p><strong>gratuita</strong>, sem qualquer remuneração (item 2);</p></li>
<li><p><strong>não exclusiva</strong>: o Colaborador continua livre para publicar a Obra em outros lugares, de preferência mencionando a publicação original na Tribuna Socialista;</p></li>
<li><p><strong>por prazo indeterminado</strong>, durante todo o período de proteção dos direitos patrimoniais da Obra;</p></li>
<li><p><strong>irrevogável e irretratável</strong>, inclusive quanto ao texto já publicado e arquivado;</p></li>
<li><p><strong>válida no Brasil e no exterior</strong>;</p></li>
<li><p>com <strong>direito de autorizar terceiros</strong> (como veículos parceiros, movimentos e organizações) a reproduzir a Obra, desde que sempre indiquem o nome do autor e a Tribuna Socialista como fonte.</p></li>
</ul>
<p>A licença abrange todas as modalidades de utilização existentes na data do aceite, incluindo:</p>
<ol>
<li><p>publicação, reprodução e republicação no site e em suas versões e plataformas;</p></li>
<li><p>envio por e-mail aos assinantes e por aplicativos de mensagens;</p></li>
<li><p>divulgação em redes sociais, inclusive em cards, recortes, citações, resumos, imagens, áudios e vídeos;</p></li>
<li><p>edições impressas e digitais, como jornais, revistas, boletins, livros, coletâneas, antologias, e-books e arquivos em PDF;</p></li>
<li><p>tradução para outros idiomas;</p></li>
<li><p>leitura e gravação em áudio, podcast ou vídeo;</p></li>
<li><p>inclusão em acervo, arquivo, banco de dados, sistemas de busca e indexação.</p></li>
</ol>

<h2>6. Nome, foto e apresentação</h2>
<p>O Colaborador autoriza, de forma gratuita e pelo mesmo prazo do item 5, o uso de seu <strong>nome, foto e breve apresentação</strong> para identificar a autoria da Obra em todas as modalidades de uso previstas neste Termo. A Obra será sempre publicada com o nome do autor, salvo pedido expresso para uso de pseudônimo aceito pela equipe.</p>

<h2>7. Responsabilidade pelo conteúdo</h2>
<p>As opiniões expressas na Obra são de responsabilidade do Colaborador e não representam necessariamente a posição da Tribuna Socialista. O Colaborador responde pela veracidade das declarações feitas no item 1. Se elas forem falsas e a Tribuna Socialista for responsabilizada por violação de direitos de terceiros, o Colaborador deverá ressarcir os prejuízos daí decorrentes, nos limites da lei.</p>

<h2>8. Retirada da Obra</h2>
<p>O Colaborador pode pedir a retirada da Obra do site pela página <a href="/contato">Contato</a>. O pedido será avaliado de boa-fé. Por se tratar de licença irrevogável, a retirada não é obrigatória, salvo nos casos garantidos por lei, como o exercício do direito moral de retirada de circulação (art. 24, VI, da Lei nº 9.610/1998), nas condições ali previstas. A retirada do site não alcança usos já realizados, como edições impressas, envios por e-mail e reproduções autorizadas antes do pedido.</p>

<h2>9. Dados pessoais</h2>
<p>Os dados pessoais do Colaborador são tratados conforme a <a href="/privacidade">Política de privacidade</a>.</p>

<h2>10. Disposições finais</h2>
<p>Se alguma cláusula for considerada inválida, as demais continuam válidas. A tolerância com o descumprimento de qualquer condição não significa renúncia a ela. A Tribuna Socialista pode atualizar este Termo para envios futuros: cada envio fica regido pela versão aceita no momento do envio. Este Termo é regido pela legislação brasileira, em especial pela Lei nº 9.610/1998 e pelo Código Civil. Fica eleito o foro da comarca de Maceió (AL), ressalvadas as hipóteses de foro legal obrigatório.</p>
$html$
where slug = 'termos-de-colaboracao';

-- ---------------------------------------------------------------------
-- 3. Envios registram o aceite do termo
-- ---------------------------------------------------------------------
alter table public.submissions
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

-- A data do aceite é carimbada pelo banco (não pelo navegador)
create or replace function public.submissions_terms_stamp()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.terms_version is not null then
    new.terms_accepted_at := now();
  end if;
  return new;
end $$;

drop trigger if exists submissions_terms_stamp on public.submissions;
create trigger submissions_terms_stamp before insert on public.submissions
  for each row execute function public.submissions_terms_stamp();

-- Sem aceite do termo, o envio é recusado
drop policy if exists "qualquer um envia texto" on public.submissions;
create policy "qualquer um envia texto" on public.submissions
  for insert to anon, authenticated
  with check (
    status = 'novo'
    and author_id is null
    and article_id is null
    and terms_version is not null
    and length(terms_version) between 1 and 120
  );
