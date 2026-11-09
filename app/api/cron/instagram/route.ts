import { NextResponse, type NextRequest } from "next/server";
import { instagramAvailable, postDueArticles, refreshTokenIfNeeded } from "@/lib/instagram/service";

/**
 * Rotina diária do Instagram (Vercel Cron): renova o token de acesso antes
 * que expire e posta textos agendados que ainda não foram ao feed.
 */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!instagramAvailable) return NextResponse.json({ status: "nao-configurado" });
  let token: string;
  try {
    token = await refreshTokenIfNeeded();
  } catch (e) {
    token = `erro: ${(e as Error).message}`;
  }
  const posts = await postDueArticles(5);
  return NextResponse.json({ token, ...posts });
}
