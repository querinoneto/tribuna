import { expect, test } from "@playwright/test";

/** "Escreva e publique conosco": visitante envia; editor vê no painel. */
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;

test("visitante envia texto e foto; o envio aparece para a edição", async ({ page, browser }) => {
  const nome = `Leitora Teste ${Date.now().toString(36)}`;

  await page.goto("/publique");
  const form = page.getByRole("main");
  await expect(page.getByRole("heading", { level: 1, name: "Escreva e publique conosco" })).toBeVisible();

  await form.getByLabel("Nome completo").fill(nome);
  await form.getByLabel("E-mail").fill(`leitora.${Date.now().toString(36)}@exemplo.test`);
  await form.getByLabel(/Título do texto/).fill("Por que a cidade precisa de mais praças");
  await form.getByLabel("Não, é a primeira vez").check();

  // Sem foto, o formulário avisa
  await form.getByLabel(/^Seu texto/).setInputFiles({ name: "artigo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 teste") });
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Enviar meu texto" }).click();
  await expect(page.getByText("Como é sua primeira publicação, envie uma foto sua.")).toBeVisible();

  await form.getByLabel(/^Sua foto/).setInputFiles({ name: "eu.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) });
  await form.getByRole("button", { name: "Enviar meu texto" }).click();
  await expect(page.getByRole("heading", { name: "Recebemos seu texto!" })).toBeVisible();

  // A edição vê o envio
  test.skip(!process.env.E2E_ADMIN_COOKIE, "Sessão de admin não configurada");
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: COOKIE_NAME, value: process.env.E2E_ADMIN_COOKIE!, domain: host, path: "/" }]);
  const admin = await ctx.newPage();
  await admin.goto("/admin/envios");
  await expect(admin.getByText(nome)).toBeVisible();
  await expect(admin.getByRole("link", { name: /Baixar o texto/ }).first()).toBeVisible();
  await ctx.close();
});

test("arquivo que não é PDF nem Word é recusado", async ({ page }) => {
  await page.goto("/publique");
  const form = page.getByRole("main");
  await form.getByLabel("Nome completo").fill("Fulano");
  await form.getByLabel("E-mail").fill("fulano@exemplo.test");
  await form.getByLabel("Sim, já publiquei").check();
  await form.getByLabel(/^Seu texto/).setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Enviar meu texto" }).click();
  await expect(page.getByText("Envie o texto em PDF ou Word (.pdf, .doc ou .docx).")).toBeVisible();
});
