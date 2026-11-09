import { requireRole } from "@/lib/auth";
import { articlePath, formatShort } from "@/lib/format";
import { getConfig, instagramAvailable } from "@/lib/instagram/service";
import { createClient } from "@/lib/supabase/server";
import { AdminNotice } from "@/components/admin/notice";
import { PageHeader } from "@/components/admin/page-header";
import { AutoToggle, PostButton, TokenForm } from "./instagram-controls";

export const metadata = { title: "Instagram" };
export const maxDuration = 120;

const STATUS_LABEL: Record<string, string> = { publicado: "No Instagram", processando: "Enviando…", erro: "Erro" };
const STATUS_STYLE: Record<string, string> = {
  publicado: "bg-[#e3f1e7] text-[#1f5c33] dark:bg-[#1d3325] dark:text-[#9fd8b0]",
  processando: "bg-[#fbeed3] text-[#7a4b06] dark:bg-[#3a2c12] dark:text-[#f0c879]",
  erro: "bg-accent/10 text-accent",
};

type Post = { status: string; permalink: string | null; error: string | null; updated_at: string };
type Row = { id: string; title: string; slug: string; published_at: string | null; instagram_posts: Post | Post[] | null };

function daysSince(iso: string | null) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;
}

export default async function InstagramPage() {
  const staff = await requireRole("admin", "editor");
  const isAdmin = staff.role === "admin";
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [cfg, { data: rows, error }] = await Promise.all([
    getConfig().catch(() => null),
    supabase
      .from("articles")
      .select("id, title, slug, published_at, instagram_posts(status, permalink, error, updated_at)")
      .in("status", ["published", "scheduled"])
      .lte("published_at", nowIso)
      .order("published_at", { ascending: false })
      .limit(20),
  ]);
  const connected = Boolean(cfg?.access_token && cfg.ig_user_id);
  const tokenAgeDays = daysSince(cfg?.token_refreshed_at ?? null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Instagram"
        description="Quando um texto é publicado no site, o card dele (no modelo do jornal) é postado automaticamente no feed do Instagram, com título, linha fina e chamada para o site na legenda."
      />

      {!instagramAvailable && (
        <AdminNotice tone="info">
          <strong>Falta a chave secreta do Supabase.</strong> Cadastre SUPABASE_SECRET_KEY nas variáveis da Vercel e faça um novo deploy.
        </AdminNotice>
      )}
      {error && (
        <AdminNotice tone="info">
          <strong>Falta rodar a migração 17 (Instagram) no Supabase.</strong> Abra o SQL Editor e execute o arquivo 20261109000017_instagram.sql.
        </AdminNotice>
      )}

      <section className="rounded-lg border border-rule bg-paper p-4 sm:p-5">
        <h2 className="font-semibold">Conta</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          {connected ? (
            <>
              Conectado a <strong className="text-ink">@{cfg?.username}</strong>. Publicação automática{" "}
              <strong className={cfg?.enabled ? "text-ink" : "text-accent"}>{cfg?.enabled ? "ligada" : "desligada"}</strong>
              {cfg?.enabled && cfg.enabled_at && <> desde {formatShort(cfg.enabled_at)}</>}.
              {cfg?.access_token?.startsWith("IG")
                ? tokenAgeDays !== null && (
                    <> O token é renovado sozinho (última renovação {tokenAgeDays === 0 ? "hoje" : `há ${tokenAgeDays} ${tokenAgeDays === 1 ? "dia" : "dias"}`}).</>
                  )
                : " O token não expira."}
            </>
          ) : (
            "Nenhuma conta conectada."
          )}
        </p>
        {isAdmin ? (
          <div className="flex flex-col gap-4">
            <TokenForm connected={connected} />
            <AutoToggle enabled={Boolean(cfg?.enabled)} connected={connected} />
          </div>
        ) : (
          <p className="text-sm text-muted">Só o administrador conecta a conta e liga ou desliga a automação.</p>
        )}
      </section>

      <h2 className="mt-8 mb-3 font-semibold">Textos publicados</h2>
      {rows && rows.length > 0 ? (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-paper">
          {(rows as unknown as Row[]).map((r) => {
            const post = Array.isArray(r.instagram_posts) ? r.instagram_posts[0] : r.instagram_posts;
            return (
              <li key={r.id} className="flex gap-3 px-3 py-3 sm:px-4">
                <a href={`/admin/textos/${r.id}/card-instagram`} target="_blank" rel="noopener" className="shrink-0" aria-label={`Ver o card de ${r.title}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/admin/textos/${r.id}/card-instagram`} alt="" width={64} height={80} loading="lazy" className="h-20 w-16 rounded border border-rule bg-paper-2 object-cover" />
                </a>
                <div className="min-w-0 flex-1">
                  <a href={r.published_at ? articlePath({ slug: r.slug, published_at: r.published_at }) : "#"} target="_blank" rel="noopener" className="line-clamp-2 text-sm font-semibold hover:underline">
                    {r.title || "Sem título"}
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {r.published_at && <span className="tabular-nums">{formatShort(r.published_at)}</span>}
                    {post ? (
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[post.status] ?? ""}`}>{STATUS_LABEL[post.status] ?? post.status}</span>
                    ) : (
                      <span>Não enviado</span>
                    )}
                    {post?.permalink && (
                      <a href={post.permalink} target="_blank" rel="noopener" className="font-semibold text-ink underline">
                        Ver no Instagram
                      </a>
                    )}
                    {post?.status !== "publicado" && post?.status !== "processando" && (
                      <PostButton id={r.id} label={post?.status === "erro" ? "Tentar de novo" : "Postar agora"} disabled={!connected} />
                    )}
                  </div>
                  {post?.status === "erro" && post.error && <p className="mt-1 text-xs text-accent">{post.error}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted">Nenhum texto publicado ainda.</p>
      )}
    </div>
  );
}
