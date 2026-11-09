"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sendDigestTest, sendPendingConfirmations, sendWeeklyDigest, syncSubscribers } from "@/lib/newsletter/service";

type Result = { ok: boolean; message: string };

export async function sendTestToMe(): Promise<Result> {
  const staff = await requireRole("admin");
  const r = await sendDigestTest(staff.email);
  return r.ok
    ? { ok: true, message: `Prévia enviada para ${staff.email} com ${r.articles} ${r.articles === 1 ? "texto" : "textos"}.` }
    : { ok: false, message: r.error ?? "Falha ao enviar a prévia." };
}

export async function sendDigestNow(): Promise<Result> {
  await requireRole("admin");
  const r = await sendWeeklyDigest("manual");
  revalidatePath("/admin/newsletter");
  if (!r.ok) return { ok: false, message: r.error };
  if (r.status === "sem-novidades") return { ok: true, message: "Nenhum texto publicado nos últimos 7 dias: nada foi enviado." };
  return { ok: true, message: `Resumo enviado aos assinantes, com ${r.articles} ${r.articles === 1 ? "texto" : "textos"}.` };
}

export async function syncNow(): Promise<Result> {
  await requireRole("admin");
  try {
    const confirmations = await sendPendingConfirmations();
    const s = await syncSubscribers();
    revalidatePath("/admin/newsletter");
    return {
      ok: true,
      message: `Sincronizado: ${s.added} enviado(s) ao Resend, ${s.cancelled} cancelamento(s) registrado(s), ${confirmations} confirmação(ões) enviada(s).`,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
