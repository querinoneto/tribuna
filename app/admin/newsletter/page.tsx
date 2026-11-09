import { requireRole } from "@/lib/auth";
import { formatShort } from "@/lib/format";
import { newsletterReady } from "@/lib/newsletter/service";
import { createClient } from "@/lib/supabase/server";
import { AdminNotice } from "@/components/admin/notice";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { deleteSubscriber } from "../crud-actions";
import { NewsletterActions } from "./newsletter-actions";

export const metadata = { title: "Assinaturas" };

const STATUS_LABEL: Record<string, string> = { ativo: "Ativa", pendente: "Aguardando confirmação", cancelado: "Cancelada" };
const STATUS_STYLE: Record<string, string> = {
  ativo: "bg-[#e3f1e7] text-[#1f5c33] dark:bg-[#1d3325] dark:text-[#9fd8b0]",
  pendente: "bg-[#fbeed3] text-[#7a4b06] dark:bg-[#3a2c12] dark:text-[#f0c879]",
  cancelado: "bg-paper-2 text-muted",
};
const SEND_LABEL: Record<string, string> = { enviado: "Enviado", "sem-novidades": "Sem textos novos", erro: "Erro" };

export default async function NewsletterPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const count = async (status: string) =>
    (await supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("status", status)).count ?? 0;

  const [{ data: subs, count: total }, ativos, pendentes, cancelados, { data: sends }] = await Promise.all([
    supabase.from("subscribers").select("id, email, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(200),
    count("ativo"),
    count("pendente"),
    count("cancelado"),
    supabase.from("newsletter_sends").select("id, week_key, kind, status, article_count, error, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Assinaturas"
        description="Quem assina recebe um e-mail para confirmar e, depois, o resumo semanal com os textos publicados nos últimos 7 dias, enviado automaticamente às sextas-feiras, às 8h."
      >
        <a href="/admin/newsletter/exportar" className="btn-ghost" download>
          Exportar CSV
        </a>
      </PageHeader>

      {!newsletterReady && (
        <AdminNotice tone="info">
          <strong>Envio por e-mail ainda não configurado.</strong> As assinaturas estão sendo registradas como “aguardando confirmação” e receberão o
          e-mail de confirmação assim que o Resend for configurado (variáveis RESEND_API_KEY, RESEND_SEGMENT_ID, NEWSLETTER_FROM, SUPABASE_SECRET_KEY e
          CRON_SECRET na Vercel).
        </AdminNotice>
      )}

      <section aria-label="Resumo" className="grid grid-cols-3 gap-3">
        {[
          { label: "Ativas", value: ativos },
          { label: "Aguardando confirmação", value: pendentes },
          { label: "Canceladas", value: cancelados },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-rule bg-paper p-4">
            <span className="block font-display text-3xl leading-none tabular-nums">{s.value}</span>
            <span className="mt-1.5 block text-xs text-muted sm:text-sm">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-rule bg-paper p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Resumo semanal</h2>
        <NewsletterActions ready={newsletterReady} />
        {sends && sends.length > 0 && (
          <ul className="mt-4 divide-y divide-rule border-t border-rule text-sm">
            {sends.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <span className="tabular-nums text-muted">{formatShort(s.created_at)}</span>
                <span className={s.status === "erro" ? "font-semibold text-accent" : "font-semibold"}>{SEND_LABEL[s.status] ?? s.status}</span>
                <span className="text-muted">
                  {s.kind === "manual" ? "envio manual" : "automático"} · {s.article_count} {s.article_count === 1 ? "texto" : "textos"}
                </span>
                {s.error && <span className="w-full text-xs text-accent">{s.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 mb-3 text-sm text-muted">
        <strong className="text-ink">{total ?? 0}</strong> {total === 1 ? "e-mail" : "e-mails"} na lista
        {(total ?? 0) > 200 && " (mostrando os 200 mais recentes; o CSV traz todos)"}
      </p>

      {subs && subs.length > 0 ? (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-paper">
          {subs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
              <span className="min-w-0 flex-1 truncate">{s.email}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status] ?? ""}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
              <span className="text-xs text-muted tabular-nums">{formatShort(s.created_at)}</span>
              <DeleteButton
                action={deleteSubscriber.bind(null, s.id)}
                label={`Remover ${s.email}`}
                title="Remover assinatura?"
                description={`${s.email} deixará de constar na lista e de receber os e-mails.`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted">Ninguém assinou ainda.</p>
      )}
    </div>
  );
}
