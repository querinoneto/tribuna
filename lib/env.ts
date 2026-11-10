/**
 * Variáveis de ambiente públicas. Nenhum segredo aqui: só a URL do projeto
 * e a chave publicável (anon), que são seguras no navegador porque todo o
 * acesso é controlado pelas políticas RLS do banco.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://tribunasocialista.com.br" : "http://localhost:3000")).replace(/\/$/, "");
export const SITE_NAME = "Tribuna Socialista";
export const SITE_TAGLINE = "Imprensa popular a serviço da classe trabalhadora brasileira";
/** O mesmo slogan em duas linhas, para o cabeçalho da capa. */
export const SITE_TAGLINE_LINES = ["Imprensa popular a serviço", "da classe trabalhadora brasileira"] as const;
export const SITE_DESCRIPTION =
  "Jornal digital independente com reportagens e opinião sobre política, economia, trabalho, meio ambiente, cultura e o mundo.";
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Maceio";

/**
 * A imagem é do próprio jornal (Storage público do Supabase)? Capas e fotos
 * de autor só podem vir daí: o servidor baixa essas imagens para montar os
 * cards do Instagram e as imagens de compartilhamento, e não deve buscar
 * endereços arbitrários (inclusive da rede interna).
 */
export function isOwnMediaUrl(url: string | null | undefined): boolean {
  if (!url || !SUPABASE_URL) return false;
  return url.startsWith(`${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/`) && !url.includes("..");
}
