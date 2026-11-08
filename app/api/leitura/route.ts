import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

const body = z.object({ id: z.string().uuid() });

/** Registra uma leitura. O banco só conta matérias publicadas. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const db = createPublicClient();
  if (db) await db.rpc("increment_views", { article_id: parsed.data.id });
  return new NextResponse(null, { status: 204 });
}
