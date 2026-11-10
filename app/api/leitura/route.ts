import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

const body = z.object({ id: z.string().uuid() });
// Segredo do servidor: sem ele, ninguém consegue refazer o resumo a partir de um IP
const SALT = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET ?? "";

/**
 * Registra uma leitura. O banco só conta matérias publicadas e, com a
 * migração 19, conta no máximo uma leitura por leitor, por matéria, por dia
 * (o leitor é identificado por um resumo irreversível do endereço IP e do
 * navegador, que muda todo dia e não é guardado por mais de dois dias).
 * Isso impede que alguém infle o "Mais lidas" repetindo o pedido.
 */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "";
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash("sha256")
    .update(`${SALT}|${day}|${ip}|${request.headers.get("user-agent") ?? ""}`)
    .digest("hex")
    .slice(0, 32);

  const admin = createAdminClient();
  if (admin) {
    const { error } = await admin.rpc("register_view", { p_article: parsed.data.id, p_visitor: visitor });
    if (!error) return new NextResponse(null, { status: 204 });
    // Banco sem a migração 19: usa a contagem antiga
  }
  const db = createPublicClient();
  if (db) await db.rpc("increment_views", { article_id: parsed.data.id });
  return new NextResponse(null, { status: 204 });
}
