import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { articlePath, formatShort } from "@/lib/format";
import { canEditArticle, STATUS_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ArticleStatus } from "@/lib/types";
import { AdminNotice } from "@/components/admin/notice";
import { NewArticleButton } from "@/components/admin/new-article-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { ArticleRowActions } from "./row-actions";

export const metadata = { title: "Textos" };

const PER_PAGE = 25;

export default async function TextosPage({ searchParams }: PageProps<"/admin/textos">) {
  const staff = await requireStaff();
  const sp = (await searchParams) as Record<string, string | undefined>;
  const q = sp.q?.trim() ?? "";
  const status = (["draft", "published", "scheduled", "archived", "revisao"] as const).find((s) => s === sp.status);
  const secao = sp.secao ?? "";
  const autor = sp.autor ?? "";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("articles")
    .select("id, title, slug, status, in_review, published_at, updated_at, created_by, sections(name), authors(name)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  if (status === "revisao") query = query.eq("in_review", true);
  else if (status) query = query.eq("status", status);
  if (secao) query = query.eq("section_id", secao);
  if (autor) query = query.eq("author_id", autor);

  const [{ data: rows, count }, { data: sections }, { data: authors }] = await Promise.all([
    query,
    supabase.from("sections").select("id, name").order("position"),
    supabase.from("authors").select("id, name").order("name"),
  ]);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (secao) p.set("secao", secao);
    if (autor) p.set("autor", autor);
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    return `?${p.toString()}`;
  };
  const filtered = Boolean(q || status || secao || autor);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {sp.aviso === "excluido" && <AdminNotice tone="success">Texto excluído.</AdminNotice>}
      {sp.erro && <AdminNotice tone="error">{sp.erro}</AdminNotice>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-tight">Textos</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "texto" : "textos"}
            {staff.role === "colunista" && " seus"}
          </p>
        </div>
        <NewArticleButton />
      </div>

      <form role="search" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]" action="/admin/textos">
        <label className="col-span-2 sm:col-span-1">
          <span className="sr-only">Buscar pelo título</span>
          <input name="q" defaultValue={q} placeholder="Buscar pelo título…" className="input" type="search" />
        </label>
        <label>
          <span className="sr-only">Estado</span>
          <select name="status" defaultValue={status ?? ""} className="input">
            <option value="">Todos os estados</option>
            <option value="revisao">Em revisão</option>
            {(Object.keys(STATUS_LABEL) as ArticleStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Editoria</span>
          <select name="secao" defaultValue={secao} className="input">
            <option value="">Todas as editorias</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Autor</span>
          <select name="autor" defaultValue={autor} className="input">
            <option value="">Todos os autores</option>
            {authors?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary flex-1">
            Filtrar
          </button>
          {filtered && (
            <Link href="/admin/textos" className="btn-ghost">
              Limpar
            </Link>
          )}
        </div>
      </form>

      {!rows || rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule p-10 text-center">
          <p className="font-display text-2xl">{filtered ? "Nada encontrado" : "Nenhum texto ainda"}</p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? "Tente outros filtros ou limpe a busca." : "Clique em “Novo texto” para começar."}
          </p>
        </div>
      ) : (
        <>
          {/* Tabela (computador) */}
          <div className="mt-6 hidden overflow-x-auto rounded-lg border border-rule bg-paper md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rule text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Título</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Editoria</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Autor</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Atualizado</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((a) => {
                  const editable = canEditArticle(staff.role, staff.id, a);
                  return (
                    <tr key={a.id} className="hover:bg-paper-2/60">
                      <td className="max-w-md px-4 py-3">
                        <Link href={`/admin/textos/${a.id}`} className="font-sans text-base font-semibold hover:underline">
                          {a.title || <span className="text-muted italic">Sem título</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status as ArticleStatus} inReview={a.in_review} /></td>
                      <td className="px-4 py-3 text-ink-soft">{(a.sections as unknown as { name: string } | null)?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{(a.authors as unknown as { name: string } | null)?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted tabular-nums">{formatShort(a.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <ArticleRowActions
                          id={a.id}
                          viewHref={a.status === "published" ? articlePath(a) : null}
                          canEdit={editable}
                          title={a.title}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lista (celular) */}
          <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-paper md:hidden">
            {rows.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/textos/${a.id}`} className="flex flex-col gap-1.5 px-4 py-3.5 active:bg-paper-2">
                  <span className="font-sans text-lg leading-snug font-semibold">
                    {a.title || <span className="text-muted italic">Sem título</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusBadge status={a.status as ArticleStatus} inReview={a.in_review} />
                    {(a.sections as unknown as { name: string } | null)?.name}
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{formatShort(a.updated_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Paginação" className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? <Link className="btn-secondary" href={qs({ pagina: page - 1 })}>← Anteriores</Link> : <span />}
              <span className="text-muted">Página {page} de {pages}</span>
              {page < pages ? <Link className="btn-secondary" href={qs({ pagina: page + 1 })}>Próximos →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
