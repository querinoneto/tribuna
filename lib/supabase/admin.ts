import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Cliente com a chave SECRETA do Supabase (ignora as regras RLS).
 * Usado apenas no servidor, para as rotinas de assinatura por e-mail
 * (confirmação e resumo semanal). Nunca importe em componentes do navegador.
 *
 * Variável: SUPABASE_SECRET_KEY (sb_secret_...) ou, em projetos antigos,
 * SUPABASE_SERVICE_ROLE_KEY.
 */
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasAdminClient = Boolean(SUPABASE_URL && SECRET);

export function createAdminClient() {
  if (!hasAdminClient) return null;
  return createClient(SUPABASE_URL, SECRET, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
