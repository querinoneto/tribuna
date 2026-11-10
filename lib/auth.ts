import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { hasSupabase } from "./env";
import { createClient } from "./supabase/server";
import type { Role } from "./types";

export type Staff = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
};

/**
 * Lê quem está logado e o papel na lista autorizada. Retorna null se não
 * houver sessão ou se o e-mail não estiver autorizado.
 * Memorizado por requisição (React cache).
 *
 * Desempenho: a sessão é conferida pela assinatura do token (getClaims, sem
 * ida ao servidor de autenticação quando o projeto usa chaves assimétricas)
 * e o papel e o perfil são lidos ao mesmo tempo. O papel continua vindo do
 * banco a cada requisição, então remover alguém em Usuários vale na hora.
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  // Sempre no momento da requisição (depende da sessão de quem acessa)
  await connection();
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const id = typeof claims?.sub === "string" ? claims.sub : null;
  const email = typeof claims?.email === "string" ? claims.email : null;
  if (!id || !email) return null;

  const [{ data: role }, { data: profile }] = await Promise.all([
    supabase.rpc("current_user_role"),
    supabase.from("profiles").select("name, avatar_url").eq("id", id).maybeSingle(),
  ]);
  if (!role) return null;

  return {
    id,
    email,
    name: profile?.name || email.split("@")[0],
    avatarUrl: profile?.avatar_url ?? null,
    role: role as Role,
  };
});

/** Exige alguém da equipe; caso contrário, manda para o login com aviso. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) {
    const supabase = hasSupabase ? await createClient() : null;
    const { data } = (await supabase?.auth.getClaims()) ?? { data: null };
    redirect(data?.claims ? "/entrar?erro=nao-autorizado" : "/entrar");
  }
  return staff;
}

/** Exige um dos papéis informados; caso contrário, volta ao painel. */
export async function requireRole(...roles: Role[]): Promise<Staff> {
  const staff = await requireStaff();
  if (!roles.includes(staff.role)) redirect("/admin?erro=sem-permissao");
  return staff;
}
