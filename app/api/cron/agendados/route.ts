import { revalidateTag } from "next/cache";
import { after, NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { instagramAvailable, postDueArticles } from "@/lib/instagram/service";
import { CONTENT_TAG } from "@/lib/revalidate";

/**
 * Chamado pelo banco (pg_cron + pg_net, migração 21) no minuto em que um
 * texto agendado entra no ar: renova a capa e as listas na hora e posta o
 * card no Instagram, sem depender da renovação do cache nem de alguém
 * abrir o Painel.
 */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  // Sem servir a versão antiga: a próxima visita já monta a página com o texto novo
  revalidateTag(CONTENT_TAG, { expire: 0 });
  // O Instagram leva alguns segundos por card; responde logo e posta em seguida
  if (instagramAvailable) after(() => postDueArticles(5).catch(() => undefined));
  return NextResponse.json({ status: "ok" });
}
