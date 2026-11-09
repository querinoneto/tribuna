import { expect, test } from "@playwright/test";

const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;

test("visitante escreve pelo Contato e só o administrador lê", async ({ page, browser }) => {
  const k = Date.now().toString(36);
  const msg = `Sugestão de pauta sobre transporte ${k}`;
  await page.goto("/contato");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Enviar mensagem" }) });
  await form.getByLabel("Nome", { exact: true }).fill("Maria");
  await form.getByLabel("Sobrenome").fill("Santos");
  await form.getByLabel("E-mail", { exact: true }).fill(`maria.${k}@exemplo.com`);
  await form.getByLabel("Mensagem", { exact: true }).fill(msg);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada!")).toBeVisible();

  test.skip(!process.env.E2E_ADMIN_COOKIE, "Sessão de admin não configurada");
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: COOKIE_NAME, value: process.env.E2E_ADMIN_COOKIE!, domain: host, path: "/" }]);
  const admin = await ctx.newPage();
  await admin.goto("/admin/contato");
  await expect(admin.getByText(msg)).toBeVisible();
  await ctx.close();

  if (process.env.E2E_COLUNISTA_COOKIE) {
    const ctx2 = await browser.newContext();
    await ctx2.addCookies([{ name: COOKIE_NAME, value: process.env.E2E_COLUNISTA_COOKIE, domain: host, path: "/" }]);
    const col = await ctx2.newPage();
    await col.goto("/admin/contato");
    await expect(col).toHaveURL(/erro=sem-permissao/);
    await ctx2.close();
  }
});
