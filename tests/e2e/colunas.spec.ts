import { expect, test, type BrowserContext } from "@playwright/test";
import { escolherCapa } from "./capa";

/**
 * Colunas com nome próprio + fórmulas em LaTeX + links legais do rodapé.
 * O colunista dá nome à coluna em "Meu perfil"; o texto da coluna dispensa
 * editoria, aparece com o nome da coluna (sem trocar a assinatura) e a
 * coluna só é alcançada pelo nome, dentro do próprio texto (não há menu).
 */
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;
const COLUNA = "Domingo no Parque";

async function login(context: BrowserContext, value: string | undefined) {
  test.skip(!value, "Sessão de teste não configurada");
  await context.addCookies([{ name: COOKIE_NAME, value: value!, domain: host, path: "/" }]);
}

test("colunista nomeia a coluna, publica sem editoria e com fórmula; a coluna não aparece em menu", async ({ page, context }) => {
  await login(context, process.env.E2E_COLUNISTA_COOKIE);

  // 1. Nome da coluna em Meu perfil
  await page.goto("/admin/perfil");
  await page.locator("input[name=column_name]").fill(COLUNA);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();

  // 2. Novo texto já nasce na coluna; editoria vira opcional
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo texto" }).click();
  await page.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}$/);
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  const naColuna = details.getByRole("checkbox", { name: new RegExp(`sai na coluna ${COLUNA}`) });
  await expect(naColuna).toBeChecked();
  // Texto de coluna não tem editoria; o painel não deixa escolher
  await expect(details.getByLabel("Editoria")).toHaveCount(0);
  // Campos que o colunista não vê: legenda, resumo, URL, manchete/fixar e troca de autor
  for (const nome of ["Legenda", "Resumo para redes sociais", "Endereço (URL)", "Autor"]) await expect(details.getByLabel(nome)).toHaveCount(0);
  await expect(details.getByText("Manchete principal da home")).toHaveCount(0);
  await expect(details.getByText("Fixar entre os destaques da home")).toHaveCount(0);
  // Desmarcar a coluna devolve a escolha da editoria; marcar de novo a esconde
  await naColuna.uncheck();
  await expect(details.getByLabel("Editoria")).toBeVisible();
  await naColuna.check();
  await expect(details.getByLabel("Editoria")).toHaveCount(0);

  const title = `Um domingo de sol e de luta ${Date.now().toString(36)}`;
  await page.getByRole("textbox", { name: "Título", exact: true }).fill(title);
  const body = page.getByRole("textbox", { name: "Corpo do texto" });
  await body.click();
  await body.pressSequentially("A conta do mês não fecha para quem vive do salário: ");

  // Fórmula pela barra de ferramentas
  await page.getByRole("button", { name: "Fórmula (LaTeX)" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fórmula (LaTeX)").fill("\\frac{salário}{cesta\\ básica} < 2");
  await dialog.getByRole("button", { name: "Inserir" }).click();
  await expect(page.locator(".tiptap [data-type=inline-math] .katex")).toBeVisible();
  await expect(page.getByText(/Salvo às \d{2}:\d{2}/)).toBeVisible({ timeout: 10_000 });

  await escolherCapa(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Texto publicado.")).toBeVisible();

  // 3. Menu da capa: só editorias; nada de Opinião nem de Colunas
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Editorias" });
  await expect(nav.getByRole("button", { name: "Colunas" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Opinião", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: COLUNA })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Política", exact: true })).toBeVisible();
  // Nas listas, o nome da coluna é só rótulo: nenhum link para /colunas/ fora da matéria
  await expect(page.locator("main a[href^='/colunas/']:visible")).toHaveCount(0);

  // A faixa Opinião não mostra textos de colunas
  await expect(page.locator("section[aria-labelledby=opiniao]").getByRole("link", { name: title })).toHaveCount(0);

  // Texto da coluna (sem editoria) entra nas listas comuns da capa, sempre com "Coluna:" no rótulo
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
  const card = page.locator("article").filter({ has: page.getByRole("link", { name: title }) }).first();
  await expect(card.getByText(`Coluna: ${COLUNA}`, { exact: true })).toBeVisible();
  // Nenhum rótulo mostra o nome da coluna sozinho, como se fosse uma editoria
  await expect(page.locator("main .kicker", { hasText: new RegExp(`^${COLUNA}$`, "i") })).toHaveCount(0);

  // 4. Matéria: rótulo da coluna, assinatura do colunista e fórmula desenhada
  await page.getByRole("link", { name: title }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("article header").getByRole("link", { name: `Coluna: ${COLUNA}` })).toBeVisible();
  await expect(page.locator("article").getByText("Paula Freire").first()).toBeVisible();
  await expect(page.locator(".prose-tribuna .math-inline .katex")).toBeVisible();

  // 5. Página da coluna
  await page.locator("article header").getByRole("link", { name: COLUNA }).click();
  await expect(page.getByRole("heading", { level: 1, name: COLUNA })).toBeVisible();
  await expect(page.getByText("por Paula Freire")).toBeVisible();
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
  // A coluna aponta para o autor (foto e biografia); o autor não aponta para a coluna
  await page.getByRole("link", { name: /Ver perfil e todos os textos de Paula Freire/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Paula Freire" })).toBeVisible();
  // (o Next mantém as páginas anteriores ocultas no DOM: só conta o que está visível)
  await expect(page.locator("a[href^='/colunas/']:visible")).toHaveCount(0);
  await page.goto("/colunistas");
  await expect(page.locator("a[href^='/colunas/']:visible")).toHaveCount(0);

  // 6. Rodapé com os documentos
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Política de Privacidade" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Termo de Colaboração" })).toBeVisible();
});

test("administrador vê URL, manchete e autor; ninguém vê legenda nem resumo para redes", async ({ page, context }) => {
  await login(context, process.env.E2E_ADMIN_COOKIE);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo texto" }).click();
  await page.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}$/);
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  await expect(details.getByLabel("Endereço (URL)")).toBeVisible();
  await expect(details.getByLabel("Autor")).toBeVisible();
  await expect(details.getByText("Manchete principal da home")).toBeVisible();
  await expect(details.getByText("Fixar entre os destaques da home")).toBeVisible();
  for (const nome of ["Legenda", "Resumo para redes sociais"]) await expect(details.getByLabel(nome)).toHaveCount(0);
});

test("o site abre no modo claro mesmo com o aparelho no modo noturno; o escuro só com o botão", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await page.getByRole("button", { name: "Ativar modo escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  // A escolha fica guardada
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await ctx.close();
});
