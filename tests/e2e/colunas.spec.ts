import { expect, test, type BrowserContext } from "@playwright/test";

/**
 * Colunas com nome próprio + fórmulas em LaTeX + links legais do rodapé.
 * O colunista dá nome à coluna em "Meu perfil"; o texto da coluna dispensa
 * editoria, aparece com o nome da coluna (sem trocar a assinatura) e a
 * coluna entra no menu da capa, em vermelho, junto de Opinião.
 */
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;
const COLUNA = "Domingo no Parque";

async function login(context: BrowserContext, value: string | undefined) {
  test.skip(!value, "Sessão de teste não configurada");
  await context.addCookies([{ name: COOKIE_NAME, value: value!, domain: host, path: "/" }]);
}

test("colunista nomeia a coluna, publica sem editoria e com fórmula; a coluna aparece no menu", async ({ page, context }) => {
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
  await expect(details.getByLabel("Coluna")).toHaveValue(/[0-9a-f-]{36}/);
  await expect(details.getByLabel("Editoria (opcional)")).toHaveValue("");

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

  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Texto publicado.")).toBeVisible();

  // 3. Menu da capa: editorias em preto, Opinião + colunas em vermelho
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Editorias" });
  const coluna = nav.getByRole("link", { name: COLUNA });
  await expect(coluna).toBeVisible();
  const color = (name: string) => nav.getByRole("link", { name, exact: true }).evaluate((el) => getComputedStyle(el).color);
  const red = await color(COLUNA);
  expect(await color("Opinião")).toBe(red);
  expect(await color("Política")).not.toBe(red);

  // 4. Matéria: rótulo da coluna, assinatura do colunista e fórmula desenhada
  await page.getByRole("link", { name: title }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("article header").getByRole("link", { name: COLUNA })).toBeVisible();
  await expect(page.locator("article").getByText("Paula Freire").first()).toBeVisible();
  await expect(page.locator(".prose-tribuna .math-inline .katex")).toBeVisible();

  // 5. Página da coluna
  await page.goto("/colunas/domingo-no-parque");
  await expect(page.getByRole("heading", { level: 1, name: COLUNA })).toBeVisible();
  await expect(page.getByText("por Paula Freire")).toBeVisible();
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

  // 6. Rodapé com os documentos
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Política de Privacidade" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Termo de Colaboração" })).toBeVisible();
});
