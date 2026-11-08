import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { formatShort } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ArticleStatus } from "@/lib/types";
import { NewArticleButton } from "@/components/admin/new-article-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminNotice } from "@/components/admin/notice";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const staff = await requireStaff();
  const sp = (await searchParams) as { erro?: string };
  const supabase = await createClient();

  const count = async (status: ArticleStatus) => {
    const { count } = await supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", status);
    return count ?? 0;
  };
  const [published, drafts, scheduled] = await Promise.all([count("published"), count("draft"), count("scheduled")]);

  const { data: recent } = await supabase
    .from("articles")
    .select("id, title, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);

  const stats = [
    { label: "Publicados", value: published, href: "/admin/textos?status=published" },
    { label: "Rascunhos", value: drafts, href: "/admin/textos?status=draft" },
    { label: "Agendados", value: scheduled, href: "/admin/textos?status=scheduled" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {sp.erro === "sem-permissao" && (
        <AdminNotice tone="error">Seu papel não tem permissão para abrir aquela página.</AdminNotice>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Olá, {staff.name.split(" ")[0]}</p>
          <h1 className="font-display text-4xl leading-tight">Painel</h1>
        </div>
        <NewArticleButton />
      </div>

      <section aria-label="Resumo" className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-rule bg-paper p-4 transition-colors hover:border-ink sm:p-5"
          >
            <span className="block font-display text-4xl leading-none sm:text-5xl">{s.value}</span>
            <span className="mt-2 block text-xs font-semibold tracking-wide text-muted uppercase sm:text-sm sm:normal-case">
              {s.label}
            </span>
          </Link>
        ))}
      </section>

      <section aria-labelledby="ultimas" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="ultimas" className="text-lg font-semibold">
            Últimas edições
          </h2>
          <Link href="/admin/textos" className="text-sm font-semibold text-accent hover:underline">
            Ver todos
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-paper">
            {recent.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/textos/${a.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-paper-2"
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-lg font-semibold">
                    {a.title || <span className="text-muted italic">Sem título</span>}
                  </span>
                  <StatusBadge status={a.status as ArticleStatus} />
                  <span className="text-xs text-muted tabular-nums">{formatShort(a.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-rule p-8 text-center">
            <p className="font-display text-2xl">Nenhum texto ainda</p>
            <p className="mt-1 text-sm text-muted">Comece pelo botão “Novo texto”.</p>
          </div>
        )}
        <p className="sr-only">Estados possíveis: {Object.values(STATUS_LABEL).join(", ")}.</p>
      </section>
    </div>
  );
}
