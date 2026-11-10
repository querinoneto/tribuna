import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";

/**
 * Todo o conteúdo público (home, editorias, matérias, autores, RSS, sitemap)
 * é cacheado com esta etiqueta. Ao publicar, editar algo publicado, mexer em
 * editorias ou páginas, expiramos o cache e a próxima visita já vê a mudança.
 */
export const CONTENT_TAG = "conteudo";

export function revalidateContent() {
  updateTag(CONTENT_TAG);
}

/**
 * Para o salvamento automático de um texto que já está no ar: expira o cache
 * do site do mesmo jeito (o leitor vê a edição na próxima visita), mas sem
 * fazer o painel recarregar a página do editor inteira a cada salvamento,
 * o que deixava o editor lento.
 */
export function revalidateContentQuiet() {
  after(() => revalidateTag(CONTENT_TAG, { expire: 0 }));
}
