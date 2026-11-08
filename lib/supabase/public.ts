import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, hasSupabase } from "@/lib/env";

/**
 * Cliente anônimo, sem cookies, para o site público. Como não depende da
 * requisição, pode ser usado dentro de funções com "use cache": o resultado
 * entra na página estática e é renovado quando algo é publicado.
 * Enxerga só o que as políticas RLS liberam para visitantes.
 */
export function createPublicClient() {
  if (!hasSupabase) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
