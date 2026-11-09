# Checklist de publicação na Vercel

Marque cada item conforme for concluindo.

## Antes

- [ ] Projeto criado no Supabase, na região São Paulo (README, 3.1)
- [ ] Extensão **pg_cron** ativada (README, 3.2)
- [ ] As 6 migrações e o `seed.sql` rodados, nesta ordem (README, 3.3)
- [ ] Em **Table Editor → allowed_emails**, `querino.neto@gmail.com` aparece como `admin`
- [ ] Em **Storage**, o bucket `media` existe e é público, e o bucket `envios` existe e é **privado**
- [ ] Login com Google configurado no Google Cloud e no Supabase (README, 4)
- [ ] Tela de consentimento do Google publicada ("Em produção")
- [ ] E-mail de acesso traduzido (README, 3.5)
- [ ] (Recomendado) SMTP próprio configurado no Supabase
- [ ] O site funcionou no seu computador com `npm run build && npm start`

## Na Vercel

- [ ] Código enviado para um repositório no GitHub (sem o `.env.local`)
- [ ] Na Vercel: **Add New → Project** → importar o repositório
- [ ] Variáveis de ambiente cadastradas (Production e Preview):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - [ ] `NEXT_PUBLIC_SITE_URL`, com o endereço definitivo, sem barra no final
- [ ] **Deploy** concluído sem erros
- [ ] (Opcional) Domínio próprio em **Settings → Domains**, seguindo as instruções de DNS da Vercel
- [ ] Se trocar o domínio depois, atualize `NEXT_PUBLIC_SITE_URL` e faça **Redeploy**

## Depois do primeiro deploy

- [ ] Supabase → **Authentication → URL Configuration**:
  - [ ] **Site URL** = endereço definitivo
  - [ ] **Redirect URLs** inclui `https://SEU-ENDERECO/auth/callback`
- [ ] Abrir `/entrar`, entrar com Google e ver o Painel
- [ ] Testar o link mágico por e-mail
- [ ] Testar com uma conta **fora** da lista e ver "Acesso não autorizado"
- [ ] Publicar um texto de teste e conferir na capa; depois apagar
- [ ] Agendar um texto para daqui a 10 minutos e conferir que entra no ar sozinho
- [ ] Inscrever um e-mail na newsletter e exportar o CSV em **Newsletter**
- [ ] Enviar um texto de teste em `/publique` e conferir em **Envios de leitores**
- [ ] Conferir `/sitemap.xml` e `/robots.txt`
- [ ] Compartilhar uma matéria no WhatsApp e ver a prévia com título e imagem
- [ ] Testar no celular: menu, modo escuro e editor
- [ ] Apagar as 3 matérias de exemplo
- [ ] Editar **Sobre**, **Contato**, **Expediente** e **Política de privacidade** em **Páginas**
- [ ] Convidar a equipe em **Usuários**
- [ ] (Opcional) Cadastrar o site no Google Search Console e enviar o `sitemap.xml`
- [ ] (Opcional) Rodar o Lighthouse (Chrome → DevTools → Lighthouse) na capa e numa matéria
