import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getRevokedAuthorIds } from "@/lib/authors";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { AuthorForm } from "./author-form";

export const metadata = { title: "Autores" };

type Row = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  is_columnist: boolean;
  is_contributor: boolean;
  profile: { email: string } | null;
  articles: { id: string }[];
};

const FILTERS = [
  { key: "", label: "Todos" },
  { key: "colunistas", label: "Colunistas" },
  { key: "colaboradores", label: "Colaboradores" },
  { key: "equipe", label: "Equipe" },
] as const;

function kindOf(a: Pick<Row, "is_columnist" | "is_contributor">) {
  return a.is_columnist ? "colunistas" : a.is_contributor ? "colaboradores" : "equipe";
}
const KIND_LABEL = { colunistas: "Colunista", colaboradores: "Colaborador", equipe: "Equipe / Redação" };

export default async function AutoresPage({ searchParams }: PageProps<"/admin/autores">) {
  const staff = await requireRole("admin");
  const { tipo = "" } = (await searchParams) as { tipo?: string };
  const supabase = await createClient();
  const [{ data }, { data: cols }, revoked] = await Promise.all([
    // Só os ids dos textos publicados de cada autor (para a contagem)
    supabase
      .from("authors")
      .select("id, name, slug, bio, avatar_url, is_columnist, is_contributor, profile:profiles(email), articles(id)")
      .eq("articles.status", "published")
      .order("name"),
    // Consulta separada: sem a migração 18, a lista de autores continua aparecendo
    supabase.from("columns").select("author_id, name"),
    // Quem teve o acesso removido em Usuários sai desta lista (a página pessoal continua no ar)
    getRevokedAuthorIds(supabase, staff.role),
  ]);
  const columnOf = new Map((cols ?? []).map((c) => [c.author_id as string, c.name as string]));

  const all = ((data ?? []) as unknown as Row[]).filter((a) => !revoked.has(a.id));
  const counts = {
    "": all.length,
    colunistas: all.filter((a) => kindOf(a) === "colunistas").length,
    colaboradores: all.filter((a) => kindOf(a) === "colaboradores").length,
    equipe: all.filter((a) => kindOf(a) === "equipe").length,
  };
  const active = FILTERS.some((f) => f.key === tipo) ? tipo : "";
  const list = active ? all.filter((a) => kindOf(a) === active) : all;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Autores"
        description="Colunistas e colaboradores que assinam textos no jornal. Colunistas entram pelo convite na área Usuários; colaboradores, pelos envios de leitores. Aqui você edita nome, foto, biografia e endereço da página de cada um. Quem tem o acesso removido em Usuários sai desta lista, mas a página pessoal e os textos continuam no ar."
      />

      <nav aria-label="Filtrar autores" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const on = f.key === active;
          return (
            <Link
              key={f.key}
              href={f.key ? `/admin/autores?tipo=${f.key}` : "/admin/autores"}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm ${
                on ? "border-ink bg-ink font-semibold text-paper" : "border-rule bg-paper hover:border-ink"
              }`}
            >
              {f.label}
              <span className={`tabular-nums ${on ? "text-paper/70" : "text-muted"}`}>{counts[f.key]}</span>
            </Link>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted">
          {active === "colunistas"
            ? "Nenhum colunista ainda. Convide em Usuários com o papel “Colunista”; a assinatura aparece aqui quando a pessoa entrar pela primeira vez."
            : active === "colaboradores"
              ? "Nenhum colaborador ainda. Eles aparecem aqui quando você prepara um texto enviado por leitor."
              : "Nenhum autor nesta lista."}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-rule rounded-lg border border-rule bg-paper">
          {list.map((a) => {
            const published = a.articles.length;
            return (
              <li key={a.id} className="p-4">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper-2 text-lg font-semibold">
                        {a.name.charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold">{a.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {KIND_LABEL[kindOf(a)]} · {published} {published === 1 ? "texto publicado" : "textos publicados"}
                        {a.profile?.email ? ` · ${a.profile.email}` : ""}
                      </span>
                    </span>
                    <span className="btn-ghost text-sm group-open:hidden">Editar</span>
                    <span className="btn-ghost hidden text-sm group-open:inline-flex">Fechar</span>
                  </summary>
                  <div className="mt-4 border-t border-rule pt-4">
                    <AuthorForm author={{ id: a.id, name: a.name, slug: a.slug, bio: a.bio ?? "", avatar_url: a.avatar_url ?? "", columnist: a.is_columnist, column_name: columnOf.get(a.id) ?? "" }} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
