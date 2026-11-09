import { expect, test, type BrowserContext } from "@playwright/test";
import { escolherCapa } from "./capa";

/**
 * Fluxo completo de publicação e agendamento, pelo navegador.
 * Requer: E2E_ADMIN_COOKIE, E2E_COLUNISTA_COOKIE e E2E_INTRUSO_COOKIE com o
 * valor do cookie de sessão do Supabase ("base64-…") de cada conta.
 */
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;

async function login(context: BrowserContext, value: string | undefined) {
  test.skip(!value, "Sessão de teste não configurada");
  await context.addCookies([{ name: COOKIE_NAME, value: value!, domain: host, path: "/" }]);
}

const unique = () => Date.now().toString(36);

test("coordenação escreve, salva automaticamente e publica; o texto aparece no site", async ({ page, context }) => {
  await login(context, process.env.E2E_ADMIN_COOKIE);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();

  await page.getByRole("button", { name: "Novo texto" }).click();
  await page.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}$/);

  const title = `Assembleia popular debate o orçamento ${unique()}`;
  await page.getByRole("textbox", { name: "Título", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Linha fina", exact: true }).fill("Moradores apresentam propostas para saúde e transporte.");
  const body = page.getByRole("textbox", { name: "Corpo do texto" });
  await body.click();
  await body.pressSequentially("Mais de duzentas pessoas participaram da assembleia no centro comunitário neste sábado.");

  // Autosave
  await expect(page.getByText(/Salvo às \d{2}:\d{2}/)).toBeVisible({ timeout: 10_000 });

  // Detalhes
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  await details.getByLabel("Editoria").selectOption({ label: "Política" });
  await details.getByLabel("Autor").selectOption({ label: "Redação" });

  await escolherCapa(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Texto publicado.")).toBeVisible();
  await expect(page.locator("header").getByText("Publicado")).toBeVisible();

  // O site público mostra o texto na hora (revalidação sob demanda)
  await page.goto("/");
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
  await page.getByRole("link", { name: title }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});

test("texto agendado não aparece no site antes da hora", async ({ page, context }) => {
  await login(context, process.env.E2E_ADMIN_COOKIE);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo texto" }).click();
  await page.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}$/);

  const title = `Texto agendado para amanhã ${unique()}`;
  await page.getByRole("textbox", { name: "Título", exact: true }).fill(title);
  const body = page.getByRole("textbox", { name: "Corpo do texto" });
  await body.click();
  await body.pressSequentially("Este texto só deve aparecer no site na data marcada pelo editor.");
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  await details.getByLabel("Editoria").selectOption({ label: "Economia" });
  await details.getByLabel("Autor").selectOption({ label: "Redação" });

  await escolherCapa(page);
  await page.getByRole("button", { name: "Agendar", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Agendar publicação" });
  const tomorrow = new Date(Date.now() + 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  await dialog
    .getByLabel("Data e hora")
    .fill(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`);
  await dialog.getByRole("button", { name: "Agendar" }).click();
  await expect(page.getByText(/Agendado para/).first()).toBeVisible();

  await page.goto(`/busca?q=${encodeURIComponent("agendado amanhã")}`);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("colunista publica o próprio texto; coordenação pode tirar do ar", async ({ page, context, browser }) => {
  await login(context, process.env.E2E_COLUNISTA_COOKIE);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo texto" }).click();
  await page.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}$/);
  const url = page.url();

  const title = `Saneamento nas periferias ${unique()}`;
  await page.getByRole("textbox", { name: "Título", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Linha fina", exact: true }).fill("Bairros pobres concentram a falta de esgoto.");
  const body = page.getByRole("textbox", { name: "Corpo do texto" });
  await body.click();
  await body.pressSequentially("A falta de saneamento atinge principalmente os bairros mais pobres da cidade.");
  await expect(page.getByText(/Salvo às \d{2}:\d{2}/)).toBeVisible({ timeout: 10_000 });

  // Destaque na capa continua sendo da coordenação
  await expect(page.getByText("Manchete principal da home")).toHaveCount(0);
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  // Se a colunista tiver coluna, o rascunho nasce na coluna (sem editoria): aqui o texto é avulso
  const naColuna = details.getByRole("checkbox", { name: /sai na coluna/ });
  if (await naColuna.count()) await naColuna.uncheck();
  await details.getByLabel("Editoria").selectOption({ label: "Política" });

  await escolherCapa(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Texto publicado.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

  // Coordenação/administração tira do ar
  test.skip(!process.env.E2E_ADMIN_COOKIE, "Sessão de admin não configurada");
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: COOKIE_NAME, value: process.env.E2E_ADMIN_COOKIE!, domain: host, path: "/" }]);
  const coord = await ctx.newPage();
  await coord.goto(url);
  await coord.getByRole("complementary", { name: "Detalhes do texto" }).getByRole("button", { name: "Voltar para rascunho" }).click();
  await expect(coord.getByText("O texto voltou a ser rascunho e saiu do site.")).toBeVisible();
  await ctx.close();

  await page.goto("/admin/usuarios");
  await expect(page).toHaveURL(/erro=sem-permissao/);
});

test("conta fora da lista vê 'acesso não autorizado'", async ({ page, context }) => {
  await login(context, process.env.E2E_INTRUSO_COOKIE);
  await page.goto("/admin");
  await expect(page).toHaveURL(/erro=nao-autorizado/);
  await expect(page.getByText(/Acesso não autorizado\. Esta conta/)).toBeVisible();
});
