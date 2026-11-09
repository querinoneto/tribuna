"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { connectAccount, disconnect, postArticle, setEnabled } from "@/lib/instagram/service";

type Result = { ok: boolean; message: string };

export async function saveToken(token: string, accountId = ""): Promise<Result> {
  await requireRole("admin");
  const t = token.trim();
  if (t.length < 20) return { ok: false, message: "Cole o token de acesso completo." };
  const id = accountId.replace(/\D/g, "");
  const r = await connectAccount(t, id || undefined);
  revalidatePath("/admin/instagram");
  return r.ok ? { ok: true, message: `Conta @${r.username} conectada.` } : { ok: false, message: r.error };
}

export async function toggleAuto(enabled: boolean): Promise<Result> {
  await requireRole("admin");
  try {
    await setEnabled(enabled);
    revalidatePath("/admin/instagram");
    return {
      ok: true,
      message: enabled ? "Publicação automática ligada: os próximos textos publicados irão para o Instagram." : "Publicação automática desligada.",
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function disconnectAccount(): Promise<Result> {
  await requireRole("admin");
  try {
    await disconnect();
    revalidatePath("/admin/instagram");
    return { ok: true, message: "Conta desconectada." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Posta (ou tenta de novo) o card de um texto já publicado. */
export async function postNow(articleId: string): Promise<Result> {
  await requireRole("admin", "editor");
  const r = await postArticle(articleId, { force: true });
  revalidatePath("/admin/instagram");
  return r.ok ? { ok: true, message: "Card publicado no Instagram." } : { ok: false, message: r.error };
}
