-- =====================================================================
-- Tribuna Socialista — Política de Privacidade, versão 3.1
-- Descreve com exatidão como as leituras são contadas (código diário
-- irreversível, sem guardar IP nem navegador, apagado em até 2 dias).
-- Só altera a cláusula 6.1.2 e a linha de versão; se o texto já tiver
-- sido editado no painel e o trecho não for encontrado, nada muda
-- (ajuste então pelo painel, em Páginas).
-- =====================================================================

update public.pages set
  updated_at = now(),
  content_json = null,
  content_html = replace(replace(
    content_html,
    '<p><strong>6.1.2.</strong> A contagem do número de leituras de cada matéria é realizada de forma agregada, sem identificação do usuário e sem formação de perfil comportamental.',
    '<p><strong>6.1.2.</strong> A contagem do número de leituras de cada matéria é realizada para impedir que uma mesma pessoa some várias leituras no mesmo dia. Para isso, o sistema gera, a cada dia, um código irreversível (resultado de função criptográfica, com chave secreta mantida apenas no servidor) a partir do endereço IP e do navegador do visitante, sem armazenar o endereço IP nem a identificação do navegador. Esse código não permite identificar o usuário nem reconstituir o endereço IP, é diferente a cada dia, de modo que não possibilita acompanhar a mesma pessoa de um dia para o outro, e é eliminado automaticamente em até 2 (dois) dias, restando apenas o total agregado de leituras de cada matéria. O tratamento tem por fundamento o legítimo interesse do controlador (art. 7º, IX, da LGPD), consistente em aferir a audiência do conteúdo e coibir a contagem artificial, e não envolve a formação de perfil comportamental.'),
    '<p><em>Versão 3.0. Vigente a partir de 9 de novembro de 2026.</em></p>',
    '<p><em>Versão 3.1. Vigente a partir de 9 de novembro de 2026.</em></p>')
where slug = 'privacidade';
