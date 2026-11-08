import "server-only";
import { updateTag } from "next/cache";

/**
 * Todo o conteúdo público (home, editorias, matérias, autores, RSS, sitemap)
 * é cacheado com esta etiqueta. Ao publicar, editar algo publicado, mexer em
 * editorias ou páginas, expiramos o cache e a próxima visita já vê a mudança.
 */
export const CONTENT_TAG = "conteudo";

export function revalidateContent() {
  updateTag(CONTENT_TAG);
}
