import { NextResponse, type NextRequest } from "next/server";
import { articlePath } from "@/lib/format";
import { createPublicClient } from "@/lib/supabase/public";

/** Endereço curto /materia/slug → redireciona (308) para o canônico /ano/mês/slug. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createPublicClient();
  const { data } = db
    ? await db.from("articles").select("slug, published_at").eq("slug", slug).maybeSingle()
    : { data: null };
  if (!data) return NextResponse.redirect(new URL(`/busca?q=${encodeURIComponent(slug.replace(/-/g, " "))}`, request.url), 307);
  return NextResponse.redirect(new URL(articlePath(data), request.url), 308);
}
