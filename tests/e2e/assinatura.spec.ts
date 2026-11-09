import { expect, test } from "@playwright/test";
import fs from "node:fs";

/**
 * Assinatura com dupla confirmação e resumo semanal.
 * Requer um servidor que imite o Resend (RESEND_API_URL) gravando as
 * chamadas em E2E_RESEND_LOG. Sem ele, o teste é pulado.
 */
const LOG = process.env.E2E_RESEND_LOG;
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;
const calls = () =>
  fs
    .readFileSync(LOG!, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { method: string; url: string; body: Record<string, unknown> | null });

test("leitor assina, confirma pelo e-mail e o painel envia o resumo", async ({ page, browser }) => {
  test.skip(!LOG || !process.env.E2E_ADMIN_COOKIE, "Resend simulado ou sessão de admin não configurados");
  const email = `leitora.${Date.now().toString(36)}@exemplo.test`;

  await page.goto("/sobre");
  const form = page.locator("#newsletter form").first();
  await form.getByRole("textbox").fill(email);
  await form.getByRole("button", { name: "Quero receber" }).click();
  await expect(page.getByText(/Enviamos um e-mail para você confirmar/)).toBeVisible();

  // O e-mail de confirmação saiu com o link
  const mail = calls().reverse().find((c) => c.url === "/emails" && (c.body?.to as string[])?.[0] === email);
  expect(mail).toBeTruthy();
  const link = String(mail!.body!.html).match(/https?:\/\/[^"]+\/assinatura\/confirmar\?token=[A-Za-z0-9_-]+/)![0];

  await page.goto(new URL(link).pathname + new URL(link).search);
  await expect(page.getByRole("heading", { name: "Assinatura confirmada!" })).toBeVisible();
  expect(calls().some((c) => c.url === "/contacts" && c.body?.email === email)).toBe(true);

  // Link usado de novo: inválido
  await page.goto(new URL(link).pathname + new URL(link).search);
  await expect(page.getByRole("heading", { name: /Link inválido/ })).toBeVisible();

  // Painel: assinante ativo e envio manual do resumo
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: COOKIE_NAME, value: process.env.E2E_ADMIN_COOKIE!, domain: host, path: "/" }]);
  const admin = await ctx.newPage();
  await admin.goto("/admin/newsletter");
  await expect(admin.getByRole("listitem").filter({ hasText: email }).getByText("Ativa")).toBeVisible();
  await admin.getByRole("button", { name: "Enviar resumo agora" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Enviar" }).click();
  await expect(admin.getByText(/Resumo enviado aos assinantes|Nenhum texto publicado/)).toBeVisible();
  await ctx.close();
});

test("rotina semanal exige a senha do cron", async ({ request }) => {
  const r = await request.get("/api/cron/resumo-semanal");
  expect(r.status()).toBe(401);
});
