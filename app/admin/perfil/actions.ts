"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/publishing";
import { saveColumnName } from "@/lib/columns";
import { revalidateContent } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { authorSchema, firstError } from "@/lib/validation";
import type { FormState } from "../crud-actions";

/** Cada pessoa da equipe edita a própria foto, nome e biografia. */
export async function saveMyProfile(_: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const key = Date.now();
  const first = String(fd.get("first_name") ?? "").trim();
  const last = String(fd.get("last_name") ?? "").trim();
  if (!first) return { ok: false, error: "Informe o nome.", key };
  if (!last) return { ok: false, error: "Informe o sobrenome.", key };
  const parsed = authorSchema.omit({ slug: true }).safeParse({
    name: `${first} ${last}`.replace(/\s+/g, " "),
    bio: String(fd.get("bio") ?? "").trim(),
    avatar_url: String(fd.get("avatar_url") ?? "").trim(),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), key };
  const { name, bio, avatar_url } = parsed.data;

  const supabase = await createClient();
  const { data: authorId, error: e1 } = await supabase.rpc("ensure_my_author");
  if (e1 || !authorId) return { ok: false, error: dbErrorMessage(e1), key };

  const { error } = await supabase.from("authors").update({ name, bio, avatar_url }).eq("id", authorId);
  if (error) return { ok: false, error: dbErrorMessage(error), key };
  await supabase.from("profiles").update({ name, avatar_url }).eq("id", staff.id);
  const col = await saveColumnName(supabase, authorId as string, fd.get("column_name"));
  if (!col.ok) return { ok: false, error: col.error, key };

  revalidateContent();
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Perfil atualizado.", key };
}
