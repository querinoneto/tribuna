import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatShort } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { prepareSubmission } from "./actions";
import { SubmissionActions } from "./submission-actions";

export const metadata = { title: "Envios de leitores" };

const TABS = [
  { key: "novo", label: "Novos" },
  { key: "lido", label: "Lidos" },
  { key: "arquivado", label: "Arquivados" },
] as const;

export default async function EnviosPage({ searchParams }: PageProps<"/admin/envios">) {
  await requireRole("admin", "editor");
  const sp = (await searchParams) as { status?: string };
  const status = TABS.find((t) => t.key === sp.status)?.key ?? "novo";

  const supabase = await createClient();
  const [{ data: rows }, ...counts] = await Promise.all([
    supabase.from("submissions").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100),
    ...TABS.map((t) => supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", t.key)),
  ]);

  // Links temporários (1 hora) para baixar os arquivos do bucket privado
  const paths = (rows ?? []).flatMap((r) => [r.file_path, r.photo_path].filter(Boolean)) as string[];
  const { data: signed } = paths.length
    ? await supabase.storage.from("envios").createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const url = new Map<string | null, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) url.set(s.path, s.signedUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Envios de leitores"
        description="Textos recebidos pela página “Escreva e publique conosco”. Os links de download valem por 1 hora; recarregue a página para gerar novos."
      />

      <nav aria-label="Filtrar envios" className="mb-6 flex gap-1 border-b border-rule">
        {TABS.map((t, i) => (
          <Link
            key={t.key}
            href={`/admin/envios?status=${t.key}`}
            aria-current={status === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${
              status === t.key ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label} <span className="font-normal tabular-nums">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {!rows || rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule p-10 text-center text-sm text-muted">Nenhum envio aqui.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-rule bg-paper p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-4">
                {r.photo_path && url.get(r.photo_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url.get(r.photo_path)} alt={`Foto de ${r.name}`} className="size-16 rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-paper-2 text-xl font-bold text-muted">
                    {r.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-tight font-bold">{r.title || <span className="font-normal text-muted italic">Sem título</span>}</p>
                  <p className="mt-1 text-sm">
                    {r.name} ·{" "}
                    <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Seu texto para a Tribuna Socialista${r.title ? `: ${r.title}` : ""}`)}`} className="text-accent underline-offset-2 hover:underline">
                      {r.email}
                    </a>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Recebido em {formatShort(r.created_at)} · {r.first_time ? "Primeira publicação" : "Já publicou antes"}
                  </p>
                </div>
              </div>
              {r.message && <p className="mt-3 rounded-md bg-paper-2 p-3 font-serif text-base whitespace-pre-line">{r.message}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {r.article_id ? (
                  <Link href={`/admin/textos/${r.article_id}`} className="btn-primary">
                    Abrir rascunho
                  </Link>
                ) : (
                  <form action={async () => { "use server"; await prepareSubmission(r.id); }}>
                    <SubmitButton className="btn-primary" pendingText="Preparando…">
                      Preparar para publicação
                    </SubmitButton>
                  </form>
                )}
                {url.get(r.file_path) && (
                  <a href={url.get(r.file_path)} className="btn-secondary" target="_blank" rel="noopener">
                    Baixar o texto{r.file_name ? ` (${r.file_name.split(".").pop()?.toUpperCase()})` : ""}
                  </a>
                )}
                {r.photo_path && url.get(r.photo_path) && (
                  <a href={url.get(r.photo_path)} className="btn-secondary" target="_blank" rel="noopener">
                    Baixar a foto
                  </a>
                )}
                <span className="flex-1" />
                <SubmissionActions id={r.id} status={r.status} name={r.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
