# Testes de ponta a ponta (opcionais)

`envios.spec.ts` testa o "Escreva e publique conosco" (envio pelo visitante e leitura pela edição).

`publicacao.spec.ts` percorre, no navegador, o fluxo completo de quatro situações:

1. o editor cria um texto, que salva sozinho; publica, e o texto aparece na capa na hora;
2. um texto agendado não aparece no site antes da hora marcada;
3. a colunista só vê "Salvar rascunho" e não acessa a tela de Usuários;
4. uma conta fora da lista vê "Acesso não autorizado".

## Como rodar

O teste precisa de:

- um servidor rodando (`npm run build && npm start`) ligado a um Supabase **de testes**, nunca o de produção;
- sessões de teste das três contas: admin, colunista e uma conta fora da lista.

O script `session.mjs` gera o cookie de sessão a partir do segredo JWT do projeto. O valor embutido é o segredo padrão do Supabase local, então ajuste-o se o seu for outro:

```bash
export E2E_ADMIN_COOKIE=$(node tests/e2e/session.mjs <uuid-do-admin> querino.neto@gmail.com)
export E2E_COLUNISTA_COOKIE=$(node tests/e2e/session.mjs <uuid> colunista@exemplo.test)
export E2E_INTRUSO_COOKIE=$(node tests/e2e/session.mjs <uuid> intruso@exemplo.test)
npx playwright install chromium   # só na primeira vez
npx playwright test
```

Sem essas variáveis, os testes são pulados.
