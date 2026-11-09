-- Tribuna Socialista — texto da página Sobre (redação do editor)
update public.pages set
  title = 'Sobre',
  content_json = null,
  updated_at = now(),
  content_html = $html$
<p>A Tribuna Socialista é um jornal digital de imprensa popular, feito a serviço da classe trabalhadora brasileira, construído coletivamente e de forma independente. Nascemos da convicção de que a informação é um campo de disputa, sob hegemonia do grande capital. Fazemos o caminho inverso e partimos da perspectiva de nossa classe, entendendo-a como protagonista e colaborando com sua emancipação.</p>
<p>Publicamos notícias e análises com atenção aos efeitos concretos de cada decisão sobre a vida do povo trabalhador. Ao lado da cobertura, abrimos espaço para colunas e artigos de opinião de militantes, pesquisadores e trabalhadores que disputam o debate público.</p>
<p>Assim como outros espaços que veiculam informação, não somos neutros: nosso lado é o lado da classe trabalhadora. Por isso, levamos a sério o rigor com os fatos, com uma linha editorial independente e todo o conteúdo é de acesso livre e gratuito.</p>
<p><strong>Venceremos!</strong></p>
$html$
where slug = 'sobre';
