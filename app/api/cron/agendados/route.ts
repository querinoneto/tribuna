import { revalidateTag } from "next/cache";
import { after, NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { instagramAvailable, postDueArticles } from "@/lib/instagram/service";
import { CONTENT_TAG } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Chamado pelo banco (pg_cron + pg_net, migrações 21 e 22) no minuto em
 * que um texto agendado entra no ar: renova a capa e as listas na hora e
 * posta o card no Instagram, sem depender da renovação do cache nem de
 * alguém abrir o Painel.
 *
 * A senha é a guardada no Vault do Supabase (tribuna_cron_secret),
 * conferida no próprio banco; o CRON_SECRET da Vercel também é aceito.
 */
export const maxDuration = 300;

async function authorized(request: NextRequest): Promise<boolean> {
  const header = request.headers.get("authorization");
  if (isCronAuthorized(header)) return true;
  const token = (header?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("t") || "").trim();
  if (!token) return false;
  const db = createAdminClient();
  if (!db) return false;
  const { data, error } = await db.rpc("site_notify_token_ok", { p_token: token });
  if (error) console.error("[agendados] conferência da senha:", error.message);
  return data === true;
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  // Sem servir a versão antiga: a próxima visita já monta a página com o texto novo
  revalidateTag(CONTENT_TAG, { expire: 0 });
  // O Instagram leva alguns segundos por card; responde logo e posta em seguida
  if (instagramAvailable) after(() => postDueArticles(5).catch(() => undefined));
  return NextResponse.json({ status: "ok" });
}
