import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { isSelectableAuthor } from "@/lib/authors";
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
  profile_id: string | null;
  revoked_at: string | null;
  profile: { email: string } | null;
  articles: { id: string }[];
};

type Kind = "admin" | "editor" | "colunista";
const FILTERS = [
  { key: "", label: "Todos" },
  { key: "admin", label: "Administração" },
  { key: "editor", label: "Coordenação" },
  { key: "colunista", label: "Colunistas" },
] as const;
const KIND_LABEL: Record<Kind, string> = { admin: "Administrador", editor: "Coordenador", colunista: "Colunista" };

export default async function AutoresPage({ searchParams }: PageProps<"/admin/autores">) {
  await requireRole("admin");
  const { tipo = "" } = (await searchParams) as { tipo?: string };
  const supabase = await createClient();
  const [{ data }, { data: cols }, { data: allowed }] = await Promise.all([
    // Só os ids dos textos publicados de cada autor (para a contagem)
    supabase
      .from("authors")
      .select("id, name, slug, bio, avatar_url, is_columnist, is_contributor, profile_id, revoked_at, profile:profiles(email), articles(id)")
      .eq("articles.status", "published")
      .order("name"),
    // Consulta separada: sem a migração 18, a lista de autores continua aparecendo
    supabase.from("columns").select("author_id, name"),
    // Papel de cada conta (administrador, coordenador ou colunista)
    supabase.from("allowed_emails").select("email, role"),
  ]);
  const columnOf = new Map((cols ?? []).map((c) => [c.author_id as string, c.name as string]));
  const roleOf = new Map((allowed ?? []).map((a) => [(a.email as string).toLowerCase(), a.role as Kind]));
  const kindOf = (a: Row): Kind | null => (a.profile?.email ? (roleOf.get(a.profile.email.toLowerCase()) ?? null) : null);

  const rows = (data ?? []) as unknown as Row[];
  // Autores são só quem tem conta ativa no painel. Colaboradores (leitores
  // que enviaram texto) não aparecem aqui; quem perdeu o acesso (ou nunca
  // teve conta) vai para "Autores antigos", no fim da página.
  const all = rows.filter((a) => isSelectableAuthor(a) && kindOf(a));
  const former = rows.filter((a) => !a.is_contributor && !all.includes(a));
  const counts: Record<string, number> = {
    "": all.length,
    admin: all.filter((a) => kindOf(a) === "admin").length,
    editor: all.filter((a) => kindOf(a) === "editor").length,
    colunista: all.filter((a) => kindOf(a) === "colunista").length,
  };
  const active = FILTERS.some((f) => f.key === tipo) ? tipo : "";
  const list = active ? all.filter((a) => kindOf(a) === active) : all;

  const item = (a: Row, label: string) => {
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
                {label} · {published} {published === 1 ? "texto publicado" : "textos publicados"}
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
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Autores"
        description="Quem assina textos no jornal: administração, coordenação e colunistas com acesso ao painel (todos entram pelo convite na área Usuários). Aqui você edita nome, foto, biografia e endereço da página de cada um. Leitores que enviaram texto não são autores e não aparecem aqui. Quem tem o acesso removido vai para “Autores antigos”, no fim da página: a página pessoal e os textos continuam no ar."
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
          Nenhum autor nesta lista. Convide em Usuários; a assinatura aparece aqui quando a pessoa entrar pela primeira vez.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-rule rounded-lg border border-rule bg-paper">{list.map((a) => item(a, KIND_LABEL[kindOf(a)!]))}</ul>
      )}

      {former.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft">
            Autores antigos ({former.length}) <span className="font-normal text-muted">· sem acesso ao painel; não aparecem em Colunistas nem podem ser escolhidos como autor</span>
          </summary>
          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-paper">{former.map((a) => item(a, "Sem acesso"))}</ul>
        </details>
      )}
    </div>
  );
}
