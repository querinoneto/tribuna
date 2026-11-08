/**
 * Variáveis de ambiente públicas. Nenhum segredo aqui: só a URL do projeto
 * e a chave publicável (anon), que são seguras no navegador porque todo o
 * acesso é controlado pelas políticas RLS do banco.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Tribuna Socialista";
export const SITE_TAGLINE = "Jornalismo independente, do lado de quem trabalha.";
export const SITE_DESCRIPTION =
  "Jornal digital independente com reportagens e opinião sobre política, economia, trabalho, meio ambiente, cultura e o mundo.";
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Maceio";
