import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { SchemaNotice } from "@/components/admin/schema-notice";
import { deleteMessage } from "./actions";
import { ReadToggle } from "./read-toggle";

export const metadata = { title: "Contato" };

type Msg = { id: string; first_name: string; last_name: string; email: string; message: string; read_at: string | null; created_at: string };

export default async function ContatoAdminPage({ searchParams }: PageProps<"/admin/contato">) {
  await requireRole("admin");
  const { filtro = "" } = (await searchParams) as { filtro?: string };
  const supabase = await createClient();
  let query = supabase
    .from("contact_messages")
    .select("id, first_name, last_name, email, message, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtro === "nao-lidas") query = query.is("read_at", null);
  const [{ data, error }, { count: unread }] = await Promise.all([
    query,
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  const messages = (data ?? []) as Msg[];
  // Tabela ainda não criada: o banco não recebeu a atualização
  const outdated = Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message)));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Contato"
        description="Mensagens enviadas pelo formulário da página Contato. Só o administrador tem acesso a esta área."
      />

      {outdated && <SchemaNotice />}
      <nav aria-label="Filtrar mensagens" className="flex gap-1">
        {[
          { key: "", label: "Todas" },
          { key: "nao-lidas", label: `Não lidas (${unread ?? 0})` },
        ].map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/contato?filtro=${f.key}` : "/admin/contato"}
            aria-current={filtro === f.key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${
              filtro === f.key ? "border-ink bg-ink font-semibold text-paper" : "border-rule bg-paper hover:border-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted">
          {filtro ? "Nenhuma mensagem não lida." : "Nenhuma mensagem recebida ainda."}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {messages.map((m) => {
            const name = `${m.first_name} ${m.last_name}`;
            return (
              <li key={m.id} className={`rounded-lg border bg-paper p-4 sm:p-5 ${m.read_at ? "border-rule" : "border-l-4 border-accent"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {name} {!m.read_at && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">nova</span>}
                    </p>
                    <p className="truncate text-sm text-muted">
                      <a href={`mailto:${m.email}`} className="underline underline-offset-2 hover:text-ink">
                        {m.email}
                      </a>{" "}
                      · {formatDateTime(m.created_at)}
                    </p>
                  </div>
                  <DeleteButton action={deleteMessage.bind(null, m.id)} label={`Apagar a mensagem de ${name}`} title="Apagar esta mensagem?" description="Ela não poderá ser recuperada." />
                </div>
                <p className="mt-3 font-serif text-[17px] leading-relaxed whitespace-pre-wrap">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3">
                  <a
                    className="btn-secondary text-sm"
                    href={`mailto:${m.email}?subject=${encodeURIComponent("Re: contato com a Tribuna Socialista")}`}
                  >
                    Responder por e-mail
                  </a>
                  <ReadToggle id={m.id} read={Boolean(m.read_at)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
