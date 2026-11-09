import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageEditor } from "./page-editor";

export const metadata = { title: "Editar página" };

export default async function EditPagePage({ params }: PageProps<"/admin/paginas/[slug]">) {
  const { slug } = await params;
  await requireRole("admin");
  const supabase = await createClient();
  const { data: page } = await supabase.from("pages").select("slug, title, content_json, content_html").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  return <PageEditor page={page} />;
}
