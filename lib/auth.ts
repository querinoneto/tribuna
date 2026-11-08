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
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  // Sempre no momento da requisição (depende da sessão de quem acessa)
  await connection();
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return null;

  const { data: role } = await supabase.rpc("current_user_role");
  if (!role) return null;

  const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("id", user.id).maybeSingle();

  return {
    id: user.id,
    email: user.email,
    name: profile?.name || user.email.split("@")[0],
    avatarUrl: profile?.avatar_url ?? null,
    role: role as Role,
  };
});

/** Exige alguém da equipe; caso contrário, manda para o login com aviso. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) {
    const supabase = hasSupabase ? await createClient() : null;
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    redirect(data.user ? "/entrar?erro=nao-autorizado" : "/entrar");
  }
  return staff;
}

/** Exige um dos papéis informados; caso contrário, volta ao painel. */
export async function requireRole(...roles: Role[]): Promise<Staff> {
  const staff = await requireStaff();
  if (!roles.includes(staff.role)) redirect("/admin?erro=sem-permissao");
  return staff;
}
