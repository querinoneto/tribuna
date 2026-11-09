import { NextResponse, type NextRequest } from "next/server";
import { newsletterReady, purgeStalePending, sendPendingConfirmations, sendWeeklyDigest } from "@/lib/newsletter/service";

/**
 * Resumo semanal automático, acionado pelo Vercel Cron (vercel.json).
 * A Vercel envia "Authorization: Bearer <CRON_SECRET>"; sem a senha, a
 * rota não faz nada.
 */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!newsletterReady) return NextResponse.json({ status: "nao-configurado" });

  const purged = await purgeStalePending();
  const confirmations = await sendPendingConfirmations();
  const result = await sendWeeklyDigest("semanal");
  return NextResponse.json({ ...result, confirmations, purged }, { status: result.ok ? 200 : 500 });
}
