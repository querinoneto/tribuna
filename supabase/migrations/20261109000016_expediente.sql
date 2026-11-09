-- Tribuna Socialista — página Expediente
update public.pages set
  title = 'Expediente',
  content_json = null,
  updated_at = now(),
  content_html = $html$
<p><strong>José Querino de Macêdo Neto</strong><br>Diretor<br><a href="mailto:contato@querinoneto.com.br">contato@querinoneto.com.br</a></p>
$html$
where slug = 'expediente';
