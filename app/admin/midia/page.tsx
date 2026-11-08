import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { MediaLibrary } from "./media-library";

export const metadata = { title: "Mídia" };

export default async function MidiaPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("media")
    .select("id, url, alt, caption, credit, width, height, size_bytes, uploaded_by, created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Mídia" description="Imagens enviadas para o jornal. Arraste arquivos para cá ou toque em “Enviar imagens”." />
      <MediaLibrary initial={media ?? []} userId={staff.id} canEditAll={staff.role !== "colunista"} />
    </div>
  );
}
