import { getStaff } from "@/lib/auth";
import { renderCardFor } from "@/lib/instagram/render";
import { createClient } from "@/lib/supabase/server";

/** Prévia do card do Instagram no painel, inclusive para rascunhos. */
export async function GET(_: Request, { params }: RouteContext<"/admin/textos/[id]/card-instagram">) {
  if (!(await getStaff())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  return renderCardFor(await createClient(), id, "private, no-store");
}
