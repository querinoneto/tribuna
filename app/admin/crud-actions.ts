"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/publishing";
import { revalidateContent } from "@/lib/revalidate";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { authorSchema, firstError, inviteSchema, pageSchema, sectionSchema } from "@/lib/validation";

export type FormState = { ok?: boolean; error?: string; message?: string; key?: number };

const done = (message: string): FormState => ({ ok: true, message, key: Date.now() });
const fail = (error: string): FormState => ({ ok: false, error, key: Date.now() });

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/* ------------------------------- Editorias ------------------------------- */
export async function saveSection(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = str(fd, "id");
  const parsed = sectionSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug") || slugify(str(fd, "name")),
    description: str(fd, "description"),
    position: str(fd, "position") || 0,
  });
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("sections").update(parsed.data).eq("id", id)
    : await supabase.from("sections").insert(parsed.data);
  if (error) return fail(error.code === "23505" ? "Já existe uma editoria com esse endereço." : dbErrorMessage(error));
  revalidateContent();
  revalidatePath("/admin/editorias");
  return done(id ? "Editoria atualizada." : "Editoria criada.");
}

export async function deleteSection(id: string): Promise<FormState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidateContent();
  revalidatePath("/admin/editorias");
  return done("Editoria removida. Os textos dela ficaram sem editoria.");
}

/* -------------------------------- Autores -------------------------------- */
/**
 * Só edita. Colunistas surgem do convite em Usuários; colaboradores, dos
 * envios de leitores. O tipo e a conta ligada não mudam por aqui.
 */
export async function saveAuthor(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = str(fd, "id");
  if (!id) return fail("Autor não encontrado.");
  const parsed = authorSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug") || slugify(str(fd, "name")),
    bio: str(fd, "bio"),
    avatar_url: str(fd, "avatar_url"),
  });
  if (!parsed.success) return fail(firstError(parsed.error));
  const { name, slug, bio, avatar_url } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("authors")
    .update({ name, slug, bio, avatar_url })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.code === "23505" ? "Já existe um autor com esse endereço. Escolha outro." : dbErrorMessage(error));
  if (!data) return fail("Autor não encontrado.");
  revalidateContent();
  revalidatePath("/admin/autores");
  return done("Autor atualizado.");
}

/* ------------------------------- Páginas ------------------------------- */
export async function savePage(slug: string, raw: unknown): Promise<FormState> {
  const staff = await requireRole("admin");
  const parsed = pageSchema.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("pages")
    .update({ ...parsed.data, content_html: sanitizeArticleHtml(parsed.data.content_html), updated_by: staff.id })
    .eq("slug", slug);
  if (error) return fail(dbErrorMessage(error));
  revalidateContent();
  return done("Página salva e publicada.");
}

/* ------------------------------- Usuários ------------------------------- */
export async function inviteUser(_: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireRole("admin");
  const parsed = inviteSchema.safeParse({ email: str(fd, "email"), role: str(fd, "role") });
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("allowed_emails")
    .insert({ email: parsed.data.email, role: parsed.data.role, invited_by: staff.id });
  if (error) return fail(error.code === "23505" ? "Esse e-mail já está na lista." : dbErrorMessage(error));
  revalidatePath("/admin/usuarios");
  return done(`${parsed.data.email} foi autorizado. Avise a pessoa para entrar em /entrar com esse e-mail.`);
}

export async function changeUserRole(email: string, role: string): Promise<FormState> {
  await requireRole("admin");
  const parsed = inviteSchema.safeParse({ email, role });
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_emails").update({ role: parsed.data.role }).eq("email", parsed.data.email);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/usuarios");
  return done("Papel atualizado.");
}

export async function removeUser(email: string): Promise<FormState> {
  const staff = await requireRole("admin");
  if (email.toLowerCase() === staff.email.toLowerCase()) {
    return fail("Você não pode remover o seu próprio acesso. Peça a outro administrador.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_emails").delete().eq("email", email);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/usuarios");
  return done(`Acesso de ${email} removido.`);
}

/* ------------------------------- Newsletter ------------------------------- */
export async function deleteSubscriber(id: string): Promise<FormState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("subscribers").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/newsletter");
  return done("Inscrição removida.");
}
