import { requireRole } from "@/lib/auth";
import { formatShort } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { deleteSubscriber } from "../crud-actions";

export const metadata = { title: "Assinaturas" };

export default async function NewsletterPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: subs, count } = await supabase
    .from("subscribers")
    .select("id, email, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Assinaturas" description="E-mails de quem assinou pelo site para receber o conteúdo por e-mail. Exporte a lista para usar no seu serviço de envio.">
        <a href="/admin/newsletter/exportar" className="btn-primary" download>
          Exportar CSV
        </a>
      </PageHeader>

      <p className="mb-3 text-sm text-muted">
        <strong className="text-ink">{count ?? 0}</strong> {count === 1 ? "assinante" : "assinantes"}
        {(count ?? 0) > 200 && " (mostrando os 200 mais recentes; o CSV traz todos)"}
      </p>

      {subs && subs.length > 0 ? (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-paper">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate">{s.email}</span>
              <span className="text-xs text-muted tabular-nums">{formatShort(s.created_at)}</span>
              <DeleteButton action={deleteSubscriber.bind(null, s.id)} label={`Remover ${s.email}`} title="Remover assinatura?" description={`${s.email} deixará de constar na lista.`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted">Ninguém se inscreveu ainda.</p>
      )}
    </div>
  );
}
