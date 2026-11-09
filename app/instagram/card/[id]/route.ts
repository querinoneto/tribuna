import { renderCardFor } from "@/lib/instagram/render";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Card do Instagram de um texto publicado (JPEG 1080 × 1350). É deste
 * endereço público que o Instagram baixa a imagem ao postar. Rascunhos e
 * agendados não aparecem aqui (as regras de acesso escondem).
 */
export async function GET(_: Request, { params }: RouteContext<"/instagram/card/[id]">) {
  const { id } = await params;
  return renderCardFor(createPublicClient(), id, "public, max-age=300, s-maxage=3600");
}
