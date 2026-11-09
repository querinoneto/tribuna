import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slug";

/**
 * Grava (ou apaga, se o nome vier vazio) a coluna com nome próprio de um
 * autor. "fd" é o valor do campo column_name; ausente = não mexe.
 */
export async function saveColumnName(
  supabase: SupabaseClient,
  authorId: string,
  raw: FormDataEntryValue | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (raw === null) return { ok: true };
  const name = String(raw).replace(/\s+/g, " ").trim();
  if (!name) {
    const { error } = await supabase.from("columns").delete().eq("author_id", authorId);
    return error && error.code !== "42P01" ? { ok: false, error: "Não foi possível remover o nome da coluna." } : { ok: true };
  }
  if (name.length < 2 || name.length > 60) return { ok: false, error: "O nome da coluna deve ter entre 2 e 60 caracteres." };
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "Use letras ou números no nome da coluna." };
  const { error } = await supabase
    .from("columns")
    .upsert({ author_id: authorId, name, slug, updated_at: new Date().toISOString() }, { onConflict: "author_id" });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma coluna com esse nome. Escolha outro." };
    if (error.code === "42P01" || /columns/.test(error.message)) return { ok: false, error: "Falta rodar a migração 18 (colunas) no Supabase." };
    return { ok: false, error: "Não foi possível salvar o nome da coluna." };
  }
  return { ok: true };
}
