import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatShort } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Páginas institucionais" };

export default async function PaginasPage() {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { data: pages } = await supabase.from("pages").select("slug, title, updated_at").order("title");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Páginas institucionais" description="Sobre, Contato, Expediente e Política de privacidade. Ficam no rodapé do site." />
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-paper">
        {pages?.map((p) => (
          <li key={p.slug}>
            <Link href={`/admin/paginas/${p.slug}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-paper-2">
              <span className="flex-1 font-serif text-lg font-semibold">{p.title}</span>
              <span className="text-xs text-muted">/{p.slug} · atualizada {formatShort(p.updated_at)}</span>
              <span className="btn-ghost text-sm">Editar</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
