import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorno do login (Google ou link mágico). Troca o código pela sessão e
 * confere se o e-mail está na lista autorizada. Quem não está é
 * desconectado e vê a mensagem de "acesso não autorizado".
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/admin";
  const next = nextParam.startsWith("/admin") && !nextParam.startsWith("//") ? nextParam : "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=link-invalido`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=link-invalido`);
  }

  const { data: role } = await supabase.rpc("current_user_role");
  if (!role) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/entrar?erro=nao-autorizado`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
