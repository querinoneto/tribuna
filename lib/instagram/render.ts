import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/env";
import { instagramCard } from "./card";

type Row = {
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  section: { name: string } | null;
  column: { name: string } | null;
  author: { name: string } | null;
};

/** Lê o texto com o cliente dado (as regras RLS decidem quem vê) e gera o card. */
export async function renderCardFor(client: SupabaseClient | null, id: string, cacheControl: string): Promise<Response> {
  if (!client || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });
  const { data } = await client
    .from("articles")
    .select("title, subtitle, cover_url, section:sections(name), column:columns(name), author:authors(name)")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!data) return new Response("Não encontrado", { status: 404 });

  const jpg = await instagramCard({
    title: data.title || "Sem título",
    subtitle: data.subtitle,
    section: data.column?.name ?? data.section?.name ?? null,
    author: data.author?.name ?? null,
    cover_url: data.cover_url,
    domain: new URL(SITE_URL).host.replace(/^www\./, ""),
  });
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": cacheControl } });
}
