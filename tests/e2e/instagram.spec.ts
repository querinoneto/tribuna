import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext } from "@playwright/test";
import { escolherCapa } from "./capa";

/**
 * Publicação automática no Instagram, contra um servidor falso da API
 * (INSTAGRAM_API_URL). Requer E2E_ADMIN_COOKIE e E2E_INSTAGRAM_LOG (arquivo
 * onde o servidor falso registra as chamadas).
 */
const COOKIE_NAME = process.env.E2E_COOKIE_NAME ?? "sb-localhost-auth-token";
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;
const LOG = process.env.E2E_INSTAGRAM_LOG;

async function login(context: BrowserContext, value: string | undefined) {
  test.skip(!value || !LOG, "Sessão de teste ou servidor falso do Instagram não configurados");
  await context.addCookies([{ name: COOKIE_NAME, value: value!, domain: host, path: "/" }]);
}

test("conecta a conta, liga a automação e o texto publicado vai para o Instagram", async ({ page, context }) => {
  await login(context, process.env.E2E_ADMIN_COOKIE);
  await page.goto("/admin/instagram");
  await expect(page.getByRole("heading", { name: "Instagram", level: 1 })).toBeVisible();

  // Token inválido é recusado com mensagem clara
  const token = page.getByLabel("Token de acesso do Instagram");
  await token.fill("IGbad-token-de-acesso-invalido");
  await page.getByRole("button", { name: /Conectar|Trocar token/ }).click();
  await expect(page.getByText(/token de acesso do Instagram expirou ou foi revogado/)).toBeVisible();

  // Token do login do Instagram ("IG…", renovável)
  await token.fill("IGteste-token-de-acesso-valido");
  await page.getByRole("button", { name: /Conectar|Trocar token/ }).click();
  await expect(page.getByText("Conta @tribunasocialista_teste conectada.")).toBeVisible();
  await expect(page.getByText(/O token é renovado sozinho/)).toBeVisible();

  // Token do login unificado ("EAA…", usuário do sistema, não expira)
  await token.fill("EAAteste-token-do-usuario-do-sistema");
  await page.getByRole("button", { name: /Conectar|Trocar token/ }).click();
  await expect(page.getByText("Conta @tribunasocialista_teste conectada.").last()).toBeVisible();
  await expect(page.getByText(/O token não expira/)).toBeVisible();

  const ligar = page.getByRole("button", { name: "Ligar publicação automática", exact: true });
  if (await ligar.isVisible()) {
    await ligar.click();
    await expect(page.getByText(/Publicação automática ligada/).first()).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Desligar publicação automática", exact: true })).toBeVisible();

  // Publica um texto novo pelo editor
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo texto" }).click();
  await page.waitForURL(/\/admin\/textos\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;
  const title = `Greve dos metroviários entra no terceiro dia ${Date.now().toString(36)}`;
  await page.getByRole("textbox", { name: "Título", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Linha fina", exact: true }).fill("Categoria cobra reajuste e contratação de pessoal.");
  const body = page.getByRole("textbox", { name: "Corpo do texto" });
  await body.click();
  await body.pressSequentially("A paralisação afeta as quatro linhas do sistema.");
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  await details.getByLabel("Editoria").selectOption({ label: "Trabalho" });
  await details.getByLabel("Autor").selectOption({ index: 1 });
  await escolherCapa(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Texto publicado.")).toBeVisible();

  // O card é gerado, baixado pelo "Instagram" e publicado, em segundo plano
  await expect
    .poll(() => readFileSync(LOG!, "utf8").includes(`"fetched":"http://${new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").host}/instagram/card/${id}`), { timeout: 20_000 })
    .toBe(true);
  const calls = readFileSync(LOG!, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const create = calls.find((c) => c.params?.image_url?.includes(id));
  expect(create.params.caption).toMatch(
    new RegExp(`^${title}: Categoria cobra reajuste e contratação de pessoal\\.\\n\\n"A paralisação afeta as quatro linhas do sistema\\."\\n\\nLeia na íntegra em `),
  );
  const fetched = calls.find((c) => c.fetched?.includes(id));
  expect(fetched).toMatchObject({ status: 200, type: "image/jpeg" });

  await page.goto("/admin/instagram");
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row.getByText("No Instagram", { exact: true })).toBeVisible();
  await expect(row.getByRole("link", { name: "Ver no Instagram" })).toBeVisible();

  // Republicar (salvar de novo) não posta duas vezes
  const before = calls.filter((c) => c.path?.endsWith("/media_publish")).length;
  await page.goto("/admin");
  await page.waitForTimeout(2000);
  const after = readFileSync(LOG!, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((c) => c.path?.endsWith("/media_publish")).length;
  expect(after).toBe(before);
});
