"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/publishing";
import { revalidateContent } from "@/lib/revalidate";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { authorSchema, firstError, inviteSchema, pageSchema, sectionSchema, tagSchema } from "@/lib/validation";

export type FormState = { ok?: boolean; error?: string; message?: string; key?: number };

const done = (message: string): FormState => ({ ok: true, message, key: Date.now() });
const fail = (error: string): FormState => ({ ok: false, error, key: Date.now() });

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/* ------------------------------- Editorias ------------------------------- */
export async function saveSection(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin", "editor");
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
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidateContent();
  revalidatePath("/admin/editorias");
  return done("Editoria removida. Os textos dela ficaram sem editoria.");
}

/* ---------------------------------- Tags ---------------------------------- */
export async function saveTag(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin", "editor");
  const id = str(fd, "id");
  const parsed = tagSchema.safeParse({ name: str(fd, "name"), slug: str(fd, "slug") || slugify(str(fd, "name")) });
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("tags").update(parsed.data).eq("id", id)
    : await supabase.from("tags").insert(parsed.data);
  if (error) return fail(error.code === "23505" ? "Essa tag já existe." : dbErrorMessage(error));
  revalidateContent();
  revalidatePath("/admin/tags");
  return done(id ? "Tag atualizada." : "Tag criada.");
}

export async function deleteTag(id: string): Promise<FormState> {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidateContent();
  revalidatePath("/admin/tags");
  return done("Tag removida.");
}

/* ------------------------------- Colunistas ------------------------------- */
export async function saveAuthor(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin", "editor");
  const id = str(fd, "id");
  const parsed = authorSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug") || slugify(str(fd, "name")),
    bio: str(fd, "bio"),
    avatar_url: str(fd, "avatar_url"),
    is_columnist: str(fd, "kind") === "colunista",
  });
  if (!parsed.success) return fail(firstError(parsed.error));
  const profileId = str(fd, "profile_id") || null;
  const supabase = await createClient();
  const row = { ...parsed.data, is_contributor: str(fd, "kind") === "colaborador", profile_id: profileId };
  const { error } = id
    ? await supabase.from("authors").update(row).eq("id", id)
    : await supabase.from("authors").insert(row);
  if (error) {
    if (error.code === "23505") return fail("Já existe um autor com esse endereço ou essa conta já está ligada a outro autor.");
    return fail(dbErrorMessage(error));
  }
  revalidateContent();
  revalidatePath("/admin/colunistas");
  return done(id ? "Autor atualizado." : "Autor criado.");
}

export async function deleteAuthor(id: string): Promise<FormState> {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { error } = await supabase.from("authors").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidateContent();
  revalidatePath("/admin/colunistas");
  return done("Autor removido. Os textos dele ficaram sem assinatura.");
}

/* ------------------------------- Páginas ------------------------------- */
export async function savePage(slug: string, raw: unknown): Promise<FormState> {
  const staff = await requireRole("admin", "editor");
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

/* ------------------------------- Mídia ------------------------------- */
export async function updateMedia(id: string, data: { alt: string; caption: string; credit: string }): Promise<FormState> {
  await requireRole("admin", "editor", "colunista");
  const supabase = await createClient();
  const { error, data: rows } = await supabase
    .from("media")
    .update({ alt: data.alt.slice(0, 300), caption: data.caption.slice(0, 400), credit: data.credit.slice(0, 120) })
    .eq("id", id)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!rows?.length) return fail("Você só pode editar imagens que enviou.");
  return done("Informações da imagem salvas.");
}

export async function deleteMedia(id: string): Promise<FormState> {
  await requireRole("admin", "editor", "colunista");
  const supabase = await createClient();
  const { data: m } = await supabase.from("media").select("path").eq("id", id).maybeSingle();
  if (!m) return fail("Imagem não encontrada.");
  const { error: stErr } = await supabase.storage.from("media").remove([m.path]);
  if (stErr) return fail("Não foi possível apagar o arquivo. Você só pode apagar imagens que enviou.");
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/midia");
  return done("Imagem apagada. Textos que a usavam ficarão sem essa imagem.");
}
