import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { escolherCapa } from "./capa";

/**
 * Do envio à publicação: o leitor manda um Word; a edição clica em
 * "Preparar para publicação"; a pessoa vira COLABORADORA (não colunista)
 * e recebe os créditos na matéria.
 */
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;

test("envio em Word vira rascunho com o texto importado e crédito de colaboração", async ({ page, browser }) => {
  test.skip(!process.env.E2E_ADMIN_COOKIE, "Sessão de admin não configurada");
  const k = Date.now().toString(36);
  const nome = `Joana Colaboradora ${k}`;
  const titulo = `Praças são infraestrutura ${k}`;

  // 1. Visitante envia
  await page.goto("/publique");
  const form = page.getByRole("main");
  await form.locator("input[name=first_name]").fill(nome.split(" ")[0]);
  await form.locator("input[name=last_name]").fill(nome.split(" ").slice(1).join(" "));
  await form.getByLabel("E-mail").fill(`joana.${k}@exemplo.test`);
  await form.getByLabel(/Título do texto/).fill(titulo);
  await form.locator("textarea[name=subtitle]").fill("A cidade que abandona suas praças abandona a convivência.");
  await form.getByLabel("Não, é a primeira vez").check();
  await form.getByLabel(/^Sua foto/).setInputFiles({ name: "joana.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) });
  await form.getByLabel(/^Seu texto/).setInputFiles({
    name: "artigo.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: readFileSync(path.join(__dirname, "fixtures/colaboracao.docx")),
  });
  await form.locator("input[name=terms]").check();
  await form.locator("input[name=consent]").check();
  await form.getByRole("button", { name: "Enviar meu texto" }).click();
  await expect(page.getByRole("heading", { name: "Recebemos seu texto!" })).toBeVisible();

  // 2. Edição prepara
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: COOKIE_NAME, value: process.env.E2E_ADMIN_COOKIE!, domain: host, path: "/" }]);
  const admin = await ctx.newPage();
  await admin.goto("/admin/envios");
  const card = admin.getByRole("listitem").filter({ hasText: nome });
  await card.getByRole("button", { name: "Preparar para publicação" }).click();
  await admin.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}\?preparado=/);

  await expect(admin.getByText(/cadastrada como colaboradora/)).toBeVisible();
  await expect(admin.getByText(/texto do arquivo Word já está no editor/)).toBeVisible();
  await expect(admin.getByRole("textbox", { name: "Título", exact: true })).toHaveValue(titulo);
  await expect(admin.getByRole("textbox", { name: "Linha fina", exact: true })).toHaveValue("A cidade que abandona suas praças abandona a convivência.");
  const body = admin.getByRole("textbox", { name: "Corpo do texto" });
  await expect(body.getByRole("heading", { name: "Praças são infraestrutura" })).toBeVisible();
  await expect(body.locator("strong")).toHaveText("Espaço público é direito, não sobra de terreno.");
  await expect(body.locator("li")).toHaveCount(2);

  const details = admin.getByRole("complementary", { name: "Detalhes do texto" });
  await expect(details.getByLabel("Autor")).toHaveValue(/.+/);
  await expect(details.getByLabel("Autor").locator("option:checked")).toHaveText(nome);

  // 3. Publica
  await details.getByLabel("Editoria").selectOption({ label: "Opinião" });
  await escolherCapa(admin);
  await admin.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(admin.getByText("Texto publicado.")).toBeVisible();

  // 4. O envio agora aponta para o rascunho
  await admin.goto("/admin/envios?status=lido");
  await expect(admin.getByRole("listitem").filter({ hasText: nome }).getByRole("link", { name: "Abrir rascunho" })).toBeVisible();
  await ctx.close();

  // 5. No site: créditos de colaboração; fora da lista de colunistas
  await page.goto(`/busca?q=${encodeURIComponent("praças infraestrutura")}`);
  await page.getByRole("link", { name: titulo }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  const byline = page.locator("article header").first();
  // Colaborador externo: nome sem link e sem página de histórico
  await expect(byline.getByText(nome, { exact: true })).toBeVisible();
  await expect(byline.getByRole("link", { name: nome })).toHaveCount(0);
  await expect(byline.getByText("Colaborador externo", { exact: true })).toBeVisible();

  await page.goto("/colunistas");
  await expect(page.getByText(nome)).toHaveCount(0);
  const slug = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await page.goto(`/autor/${slug}`);
  await expect(page).toHaveTitle(/não encontrado/);
});
