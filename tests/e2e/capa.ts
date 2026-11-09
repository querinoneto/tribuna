import { expect, type Page } from "@playwright/test";

/** Escolhe a primeira imagem da biblioteca como capa e descreve a imagem (a capa é obrigatória para publicar). */
export async function escolherCapa(page: Page) {
  const details = page.getByRole("complementary", { name: "Detalhes do texto" });
  await details.getByRole("button", { name: "Escolher da biblioteca" }).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog.getByRole("heading", { name: "Biblioteca de imagens" })).toBeVisible();
  await dialog.locator("ul button").first().click();
  await details.getByLabel(/Texto alternativo/).fill("Foto ilustrativa do texto");
}
