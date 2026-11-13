# Tribuna Socialista

Jornal digital com site público e painel administrativo para publicar textos.

- **Site público**: capa, editorias, matérias, colunistas, busca, newsletter, "Escreva e publique conosco" (envio de textos por leitores) e modo escuro.
- **Painel (`/admin`)**: editor de texto com salvamento automático, imagens, agendamento e controle de quem pode fazer o quê.

Guias rápidos:

- [Como publicar seu primeiro texto](docs/COMO-PUBLICAR.md)
- [Checklist de publicação na Vercel](docs/CHECKLIST-DEPLOY.md)

---

## Sumário

1. [Tecnologias](#1-tecnologias)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Criar o projeto no Supabase](#3-criar-o-projeto-no-supabase)
4. [Configurar o login com Google](#4-configurar-o-login-com-google)
5. [Rodar no seu computador](#5-rodar-no-seu-computador)
6. [Publicar na Vercel](#6-publicar-na-vercel)
7. [Papéis e segurança](#7-papéis-e-segurança)
8. [Como funcionam a publicação, o cache e o agendamento](#8-como-funcionam-a-publicação-o-cache-e-o-agendamento)
9. [Testes](#9-testes)
10. [Problemas comuns](#10-problemas-comuns)

---

## 1. Tecnologias

| Parte | Escolha |
| --- | --- |
| Site e painel | Next.js 16 (App Router, Cache Components) + TypeScript |
| Estilo | Tailwind CSS 4 |
| Banco, login e imagens | Supabase (Postgres, Auth e Storage) |
| Editor de texto | Tiptap 3 |
| Validação | Zod, com o HTML do editor higienizado por `sanitize-html` |
| Testes | Vitest (regras de acesso e publicação) e Playwright (fluxo no navegador) |
| Hospedagem | Vercel |

As fontes (Newsreader e Inter Tight, licença SIL OFL) ficam no próprio projeto e são carregadas com `next/font/local`. Assim o site não faz chamadas ao Google.

## 2. Estrutura de pastas

```
app/
  (site)/(capa)/          capa (cabeçalho grande)
  (site)/(paginas)/       matéria /ano/mês/slug, editoria, autor, busca, tag, colunistas, páginas institucionais
  admin/                  painel: textos, envios, produção, autores, editorias, páginas, contato, newsletter, usuários
  entrar/                 login (Google ou link por e-mail)
  auth/                   retorno do login e saída
  materia/[slug]/         endereço curto, que redireciona para /ano/mês/slug
  sitemap.ts  robots.ts  icon.png  apple-icon.png
components/
  site/                   cabeçalho, rodapé, cards, matéria, compartilhar, newsletter
  admin/                  editor de texto, barra de formatação, diálogos, avisos
lib/
  data/public.ts          consultas do site (com cache)
  supabase/               clientes do Supabase (servidor, navegador, público)
  auth.ts  permissions.ts  publishing.ts  validation.ts  sanitize.ts  format.ts
supabase/
  migrations/             tabelas, regras de acesso (RLS), Storage e agendamento
  seed.sql                administrador inicial, editorias, páginas e 3 matérias de exemplo
  templates/              modelo em português do e-mail de acesso
tests/
  unit/                   regras de permissão e de publicação
  db/                     regras de acesso testadas no Postgres de verdade
  e2e/                    fluxo completo no navegador (opcional)
proxy.ts                  protege /admin (antigo "middleware")
```

## 3. Criar o projeto no Supabase

### 3.1 Criar o projeto

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
2. Escolha um nome (ex.: `tribuna-socialista`), uma senha forte para o banco e a região **South America (São Paulo)**.
3. Espere o projeto ficar pronto, o que leva uns dois minutos.

### 3.2 Ativar o agendamento (pg_cron)

Vá em **Database → Extensions**, procure **pg_cron** e ative.

O agendamento funciona mesmo sem essa extensão, porque o site só mostra um texto agendado depois da hora marcada. O pg_cron muda o rótulo de "Agendado" para "Publicado" no painel e, com o passo abaixo, avisa o site.

**Para o agendado aparecer na capa e ir ao Instagram no minuto marcado**, ative também a extensão **pg_net** (mesma tela), rode as migrações 21 e 22 e, em **SQL Editor**, guarde no Vault o endereço do site e uma senha longa e aleatória (não precisa ser igual a nada na Vercel: o site confere essa senha no próprio Vault, com a `SUPABASE_SECRET_KEY`):

```sql
select vault.create_secret('https://tribunasocialista.com.br', 'tribuna_site_url');
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'tribuna_cron_secret');
```

Sem isso, o agendado aparece em até 5 minutos (cache) e vai ao Instagram quando alguém abre o Painel ou na rotina diária.

### 3.3 Criar as tabelas e as regras de acesso

Escolha **um** dos dois caminhos.

**Caminho A: pelo navegador, sem instalar nada.** Abra **SQL Editor → New query** e rode o conteúdo de cada arquivo abaixo, **nesta ordem**, um de cada vez (cole o texto e clique em **Run**):

1. `supabase/migrations/20261108000001_schema.sql`
2. `supabase/migrations/20261108000002_rls.sql`
3. `supabase/migrations/20261108000003_storage_cron.sql`
4. `supabase/migrations/20261108000004_submissions.sql`
5. `supabase/migrations/20261108000005_contributors.sql`
6. `supabase/migrations/20261108000006_security_hardening.sql`
7. `supabase/migrations/20261108000007_autores_revisao_contato.sql`
8. `supabase/migrations/20261108000008_colunista_publica_perfil.sql`
9. `supabase/migrations/20261108000009_paginas_termo_colaboracao.sql`
10. `supabase/migrations/20261109000010_responsabilidade_autor.sql`
11. `supabase/migrations/20261109000011_privacidade_sobre_texto_corrido.sql`
12. `supabase/migrations/20261109000012_politica_privacidade_v3.sql`
13. `supabase/migrations/20261109000013_sobre.sql`
14. `supabase/migrations/20261109000014_assinaturas_resumo_semanal.sql`
15. `supabase/migrations/20261109000015_envio_linha_fina.sql`
16. `supabase/migrations/20261109000016_expediente.sql`
17. `supabase/migrations/20261109000017_instagram.sql`
18. `supabase/migrations/20261109000018_colunas.sql`
19. `supabase/migrations/20261109000019_revisao_geral.sql` (acesso revogado, regras de publicação reforçadas, contagem de leituras, tetos contra abuso e desempenho)
20. `supabase/migrations/20261109000020_privacidade_contagem_leituras.sql` (Política de Privacidade 3.1: descreve a contagem de leituras)
21. `supabase/migrations/20261112000021_agendados_avisam_o_site.sql` (o agendado aparece na capa e vai ao Instagram no minuto marcado; veja 3.2)
22. `supabase/migrations/20261113000022_aviso_confere_senha_no_vault.sql` (a senha desse aviso é conferida no próprio Vault; espera até 30 s)
23. `supabase/migrations/20261113000023_autores_so_equipe_ativa.sql` (autores são só administração, coordenação e colunistas com acesso ativo; sai a "Redação")
7. `supabase/seed.sql`

**Caminho B: pela linha de comando**, com a [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase db push            # aplica as migrações
# depois rode supabase/seed.sql no SQL Editor (último passo do caminho A)
```

O `seed.sql` faz o seguinte:

- cadastra **querino.neto@gmail.com** como administrador;
- cria as editorias (Política, Economia, Trabalho, Meio Ambiente, Cultura, Internacional e Opinião), e as páginas Sobre, Contato, Expediente e Privacidade;
- publica 3 matérias de exemplo, que você pode apagar pelo painel.

### 3.4 Configurar os endereços de login

Em **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` enquanto testa. Depois de publicar, troque pelo endereço definitivo (ex.: `https://www.tribunasocialista.com.br`).
- **Redirect URLs**: adicione **todos** os endereços abaixo:
  - `http://localhost:3000/auth/callback`
  - `https://SEU-SITE.vercel.app/auth/callback`
  - `https://www.SEUDOMINIO.com.br/auth/callback` (quando tiver o domínio)

### 3.5 E-mail de acesso em português (recomendado)

Em **Authentication → Emails → Magic Link**:

- **Assunto**: `Seu link de acesso à Tribuna Socialista`
- **Corpo**: cole o conteúdo de `supabase/templates/magic-link.html`.

Faça o mesmo em **Confirm signup**, que é o e-mail enviado no primeiro acesso de cada pessoa.

> O envio de e-mail embutido do Supabase tem limite baixo, de poucos e-mails por hora. Para produção, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (Resend, Brevo, Amazon SES etc.).

### 3.6 Copiar as chaves

Em **Project Settings → API Keys**, copie:

- a **Project URL**;
- a **Publishable key** (começa com `sb_publishable_`). Em projetos antigos, use a **anon public**.

Você vai usá-las no `.env.local` e na Vercel. **Não** use a chave secreta (`service_role`/`secret`): o site não precisa dela.

## 4. Configurar o login com Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto (ex.: "Tribuna Socialista").
2. Configure a tela de consentimento em **APIs e serviços → Tela de consentimento OAuth** (ou **Google Auth Platform → Branding**):
   - tipo de usuário **Externo**;
   - nome do app "Tribuna Socialista" e o seu e-mail de suporte;
   - publique o app ("Em produção"). Enquanto estiver "Em teste", só os e-mails cadastrados como testadores conseguem entrar.
3. Em **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - tipo **Aplicativo da Web**;
   - em **URIs de redirecionamento autorizados**, cole `https://SEU-PROJETO.supabase.co/auth/v1/callback`, que aparece pronto no Supabase, em **Authentication → Sign In / Providers → Google**.
4. Copie o **ID do cliente** e a **Chave secreta do cliente**.
5. No Supabase, vá em **Authentication → Sign In / Providers → Google**, ative, cole os dois valores e salve.

O link mágico por e-mail já vem ativado no Supabase e funciona como alternativa ao Google.

## 5. Rodar no seu computador

Você precisa do **Node.js 20 ou mais novo** (<https://nodejs.org>).

```bash
npm install
cp .env.example .env.local     # depois edite e preencha os 3 valores
npm run dev
```

Abra <http://localhost:3000>. Para o painel, acesse <http://localhost:3000/entrar> e entre com **querino.neto@gmail.com**.

Comandos úteis:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | gera a versão de produção (o mesmo que a Vercel roda) |
| `npm start` | serve a versão de produção localmente |
| `npm run lint` | verifica o código |
| `npm run typecheck` | verifica os tipos |
| `npm test` | roda os testes |

## 6. Publicar na Vercel

Resumo abaixo. O passo a passo completo está no [checklist](docs/CHECKLIST-DEPLOY.md).

1. Suba o projeto para um repositório no GitHub. O `.env.local` **não** vai junto, porque está no `.gitignore`.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O framework (Next.js) é detectado sozinho.
3. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` (o endereço final do site).
4. Clique em **Deploy**.
5. Volte ao Supabase e atualize a **Site URL** e as **Redirect URLs** (passo 3.4) com o endereço da Vercel ou do seu domínio.

## 7. Papéis e segurança

| Papel | O que pode fazer |
| --- | --- |
| **admin** | tudo, inclusive convidar pessoas, editar autores e páginas, apagar mensagens do Contato e exportar a newsletter |
| **coordenador** (`editor` no banco) | tudo o que o colunista faz, mais: editar, publicar e tirar do ar qualquer texto; trocar o autor de um texto; aprovar envios de leitores; Produção, Editorias e Contato (sem apagar mensagens). Manchete principal, fixar na home e mudar o endereço (URL) são só do administrador |
| **colunista** | escrever, publicar, agendar e tirar do ar **só os próprios** textos; editar a própria foto, nome e biografia |
| **visitante** | ler o que está publicado (não precisa de conta) |

A proteção funciona em três camadas:

1. **No banco (a camada definitiva).** As políticas **Row Level Security** do Postgres (`supabase/migrations/*_rls.sql`) e um gatilho que impede colunistas de publicar, destacar ou trocar a autoria. Elas valem mesmo para quem tentar chamar a API do Supabase diretamente.
2. **No servidor.** O `proxy.ts` manda para o login quem abre `/admin` sem sessão. O painel confere o papel de quem está logado em cada página e em cada ação.
3. **Na interface.** Botões que a pessoa não pode usar nem aparecem, mas isso é só conveniência.

O acesso é decidido pela **lista autorizada** (tabela `allowed_emails`). Quem entra com um e-mail fora da lista vê "Acesso não autorizado" e é desconectado na hora. Remover alguém da lista em **Usuários** corta o acesso imediatamente, e o banco impede que o jornal fique sem nenhum administrador.

**Acesso removido.** Quem sai de **Usuários** some da área **Autores**, da página **Colunistas** e das opções de assinatura no editor (`authors.revoked_at`, preenchido por gatilho). O nome, a foto, a biografia, a página pessoal (`/autor/...`) e os textos continuam no ar. Se a pessoa for convidada de novo, volta a aparecer.

Outras proteções:

- o HTML dos textos é higienizado **ao salvar e de novo ao exibir** (sem scripts, sem eventos e sem iframes que não sejam do YouTube). A segunda limpeza protege contra conteúdo gravado direto pela API, sem passar pelo site;
- o papel de cada pessoa só vale com **e-mail confirmado** no Supabase;
- colunistas só assinam com o próprio nome e não mudam o tipo nem o endereço da própria assinatura;
- cabeçalho `Content-Security-Policy` básico (o site não pode ser embutido por terceiros, sem plugins, formulários só para o próprio site);
- uploads só de imagens de até 5 MB, limite conferido no navegador e no próprio bucket do Storage;
- cabeçalhos de segurança: HSTS, X-Frame-Options, nosniff, Referrer-Policy e Permissions-Policy;
- a exportação em CSV protege contra fórmulas maliciosas no Excel;
- **regras de publicação no banco** (migração 19): só o administrador escolhe a manchete e fixa textos; ninguém altera o contador de leituras, antedata a publicação ou agenda no passado; o endereço de um texto que já foi ao ar não muda (salvo pelo administrador);
- **leituras** contadas pelo servidor, no máximo uma por leitor, por texto, por dia (resumo irreversível e diário do IP e do navegador, apagado em dois dias). Requer `SUPABASE_SECRET_KEY` na Vercel;
- capas só podem vir do próprio Storage (o servidor nunca baixa imagens de endereços arbitrários para montar os cards);
- **Contato com captcha**: imagem com 5 números desenhados (gerada no servidor, sem serviço externo), que vale 15 minutos e só é aceita depois de 3 segundos; mais o campo-armadilha contra robôs e no máximo 3 links por mensagem;
- **texto de visitantes limpo** (Contato e Envios): caracteres invisíveis que escondem instruções ou trechos (largura zero, inversão de direção, caracteres "tag") são removidos, e letras disfarçadas são normalizadas;
- **arquivos de leitores conferidos pelo conteúdo**, não pela extensão: PDF com JavaScript, comandos ou arquivos embutidos, Word com macros, ActiveX ou objetos embutidos, e "fotos" que não são imagem de verdade são recusados e apagados; a foto aprovada é regravada (sem metadados) antes de ir para a biblioteca;
- **tetos contra abuso**: 60 mensagens de Contato, 40 envios de leitores, 80 arquivos enviados e 40 e-mails de confirmação de assinatura por hora, somando todos os remetentes (além do limite por e-mail);
- a senha do cron é comparada em tempo constante;
- **envios de leitores** ("Escreva e publique conosco", em `/publique`): os arquivos vão para um bucket **privado** (`envios`, até 10 MB, só PDF, Word e imagens). Visitantes só conseguem enviar, nunca ler; apenas editores e administradores veem e baixam os envios, em **Painel → Envios de leitores**. Há limite de 5 envios por e-mail por hora.
- **Preparar para publicação**: em cada envio, esse botão cadastra a pessoa como **colaboradora** (ou reaproveita o cadastro, se ela já mandou textos), copia a foto para a biblioteca, cria o rascunho com título e autor e, se o arquivo for Word (.docx), já importa o texto. Colaboradores recebem os créditos ("Colaboração") mas **não** aparecem entre os colunistas: colunista é só quem a edição cadastra como tal, em **Colunistas e autores**.

### Redes sociais do rodapé

Os botões de Instagram e YouTube ficam em `lib/social.ts`. Preencha o endereço de cada perfil para ativar o link; enquanto estiver vazio, o botão aparece sem link.

## 8. Como funcionam a publicação, o cache e o agendamento

- As páginas públicas são **estáticas**: geradas uma vez e servidas de cache, por isso são muito rápidas.
- Ao **publicar, atualizar, despublicar ou arquivar**, o painel expira o cache na hora (`updateTag("conteudo")`), e a próxima visita já mostra a mudança.
- Por segurança, o conteúdo também se renova sozinho a cada 5 minutos no máximo.
- **Agendamento.** O texto agendado recebe a data de publicação escolhida, e o site só mostra textos com data de publicação já passada. O pg_cron, a cada minuto, muda o rótulo para "Publicado" e chama `/api/cron/agendados` (pg_net), que expira o cache na hora e posta o card no Instagram. Sem pg_net ou sem os segredos do Vault (3.2), o texto entra no ar com atraso de até 5 minutos por causa do cache.
- **Leituras.** Cada visita à matéria soma uma leitura (uma por pessoa por sessão). A lista "Mais lidas" considera os últimos 30 dias.

## 8.1. Assinaturas por e-mail (resumo semanal)

- Quem assina pelo site recebe um e-mail de **confirmação** (dupla confirmação). Só depois a assinatura fica ativa.
- Toda **sexta-feira às 8h** (horário de Maceió), o Vercel Cron chama `/api/cron/resumo-semanal`, que envia pelo **Resend** um resumo com os textos publicados nos últimos 7 dias. Sem textos novos, nada é enviado. O horário fica em `vercel.json` (em UTC).
- O cancelamento é feito pelo link do rodapé de cada e-mail (gerido pelo Resend) e sincronizado com o banco antes de cada envio.
- No painel, em **Assinaturas**: situação de cada e-mail, prévia enviada para você, envio manual e histórico.
- Variáveis na Vercel: `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `NEWSLETTER_FROM`, `CRON_SECRET` (e, opcional, `NEWSLETTER_REPLY_TO`). Veja `.env.example`.

## 8.1.1. Colunas com nome e fórmulas

- **Colunas com nome próprio.** O colunista dá nome à sua coluna em **Meu perfil** (o administrador também pode, em **Autores**). A coluna ganha página em `/colunas/<nome>`, mas **não há menu nem lista de colunas**: a página só é alcançada pelo nome da coluna, no alto da própria matéria. A página da coluna mostra o autor (foto, biografia e link para o perfil); a página do autor não aponta para a coluna. A faixa Opinião da capa mostra só textos da editoria Opinião, nunca de colunas. No editor, quem tem coluna vê a caixa **Este texto sai na coluna …**; marcada, o texto não tem editoria. O nome da coluna não substitui a assinatura do colunista.
- **Imagem de capa obrigatória** para publicar ou agendar qualquer texto (com texto alternativo).
- **Campos do editor por papel** (regras em `lib/article-rules.ts`, aplicadas no servidor): o endereço (URL), a manchete principal e a fixação na home são só do **administrador** (para os demais, o endereço de um rascunho nasce do título e, depois de publicado, não muda); trocar o autor do texto é do administrador e da coordenação. A legenda da imagem de capa e o "resumo para redes sociais" saíram do painel.
- **Autores.** Só assina texto quem tem conta ativa no painel: administrador, coordenador ou colunista (todos aparecem em Colunistas). Leitores que enviaram texto (colaboradores) não são autores e não podem ser escolhidos no editor; o texto preparado em **Envios** continua assinado com o nome do leitor. Quem perde o acesso sai de Autores (vai para "Autores antigos") e de Colunistas, mas a página pessoal e os textos continuam no ar. Não existe mais a autora "Redação": texto sem autor aparece assinado "Tribuna Socialista".
- **Notas de rodapé.** Botão **x¹** na barra do editor: o texto da nota fica guardado no ponto da chamada, aparece como número sobrescrito e entra numerado na seção **Notas**, no fim do texto (clique no número, no editor, para editar ou apagar).
- **Fórmulas (LaTeX).** Botão **∑** na barra do editor, ou digite `$$fórmula$$` (no meio da frase) ou `$$$fórmula$$$` (em destaque). Clique na fórmula para editar. No site, são desenhadas pelo KaTeX.

## 8.2. Instagram (card automático)

- Ao **publicar** um texto, o site gera o card no modelo do jornal (1080 × 1350, JPEG) em `/instagram/card/<id>` e o posta no feed pela API oficial do Instagram (`graph.instagram.com`), com fundo preto, letra branca e o vermelho do logotipo (#970512) na etiqueta da editoria e nos filetes, e legenda no formato "Título: linha fina." + o primeiro parágrafo entre aspas + "Leia na íntegra em <domínio>". Cada texto vai uma única vez.
- Textos **agendados** vão ao Instagram no minuto marcado, pelo aviso do banco ao site (`/api/cron/agendados`, ver 3.2). Se esse aviso não estiver configurado, vão quando alguém abre o Painel depois da hora marcada ou, no máximo, na rotina diária (`/api/cron/instagram`, 9h30 de Maceió), que também renova o token de acesso.
- Painel → **Instagram**: conectar a conta (colar o token), ligar/desligar a automação, ver a prévia do card de cada texto, "Postar agora" e "Tentar de novo". Só textos publicados **depois** de ligar a automação são postados sozinhos.
- Requisitos: conta do Instagram **profissional** (Empresa ou Criador) e um app na Meta (developers.facebook.com) com o caso de uso do Instagram. Funciona com os dois tipos de token: login do Instagram (`IG…`, 60 dias, renovado sozinho, em graph.instagram.com) ou login unificado (`EAA…`, usuário do sistema, não expira, em graph.facebook.com; exige portfólio empresarial e a permissão `instagram_content_publish`). Também precisa de `SUPABASE_SECRET_KEY` e `CRON_SECRET` na Vercel.

## 9. Testes

```bash
npm test
```

- `tests/unit`: regras de permissão por papel, transições de publicação e agendamento, higienização de HTML, validação de uploads e formatação de datas em português.
- `tests/db`: aplica as migrações reais num Postgres e testa as políticas RLS como visitante, conta não autorizada, colunista, editor e admin, além do acesso revogado e dos tetos contra abuso (64 cenários).

Os testes de banco precisam de um Postgres local, por padrão `postgresql://postgres@localhost:54322/postgres`; outro endereço pode ser definido em `TEST_DATABASE_ADMIN_URL`. Sem ele, esses testes são pulados com um aviso. Se você tiver Docker, um jeito simples é:

```bash
docker run -d --name tribuna-pg -p 54322:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
TEST_DATABASE_ADMIN_URL=postgresql://postgres@localhost:54322/postgres npm test
```

O teste de ponta a ponta no navegador (`tests/e2e`) é opcional; veja `tests/e2e/README.md`.

## 10. Problemas comuns

**"Acesso não autorizado" com o meu e-mail.** Confira se o e-mail está na tabela `allowed_emails` (Supabase → Table Editor). Ele precisa estar em minúsculas e ser exatamente o e-mail da conta Google.

**O login com Google volta para a página de login.** Confira as **Redirect URLs** (3.4) e o URI de redirecionamento no Google (4.3).

**O link do e-mail diz que expirou.** Cada link vale uma vez e por uma hora. Peça outro. Se abrir em outro navegador ou aplicativo, copie o link e abra no mesmo navegador onde pediu.

**Publiquei e o texto não apareceu.** Recarregue a página. Se ainda não aparecer, confira se o texto tem data de publicação no passado (os agendados só aparecem na hora marcada).

**O painel está lento.** Confira se a Vercel roda as funções na mesma região do banco: no Supabase, **Project Settings → General → Region**; na Vercel, **Settings → Functions → Function Region** (para um banco em São Paulo, `sa-east-1`, escolha **São Paulo, gru1**). Com o banco em outro continente, cada consulta do painel atravessa o oceano.

**A imagem não sobe.** São aceitos JPG, PNG, WebP, GIF e AVIF de até 5 MB. Confira também se a migração `..._storage_cron.sql` foi aplicada, porque é ela que cria o bucket `media`.
