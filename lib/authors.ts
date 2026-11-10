import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

/**
 * Autores cujo acesso ao painel foi revogado (a pessoa saiu de Usuários).
 * Eles somem da área Autores, da lista de Colunistas e das opções de
 * assinatura no editor; o nome, a foto, a biografia, a página pessoal e os
 * textos continuam no ar.
 *
 * Fonte: a coluna authors.revoked_at (migração 19). Se o banco ainda não
 * tiver essa coluna, o administrador (que enxerga a lista de Usuários)
 * deduz a revogação comparando a conta ligada com a lista autorizada.
 */
export async function getRevokedAuthorIds(supabase: SupabaseClient, role: Role): Promise<Set<string>> {
  const { data, error } = await supabase.from("authors").select("id").not("revoked_at", "is", null);
  if (!error) return new Set((data ?? []).map((a) => a.id as string));
  if (role !== "admin") return new Set();

  const [{ data: authors }, { data: allowed }] = await Promise.all([
    supabase.from("authors").select("id, profile:profiles(email)").not("profile_id", "is", null),
    supabase.from("allowed_emails").select("email"),
  ]);
  const ok = new Set((allowed ?? []).map((a) => (a.email as string).toLowerCase()));
  const out = new Set<string>();
  for (const a of (authors ?? []) as unknown as { id: string; profile: { email: string } | null }[]) {
    if (a.profile?.email && !ok.has(a.profile.email.toLowerCase())) out.add(a.id);
  }
  return out;
}
