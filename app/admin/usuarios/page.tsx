import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { ActionForm } from "@/components/admin/action-form";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { inviteUser } from "../crud-actions";
import { UserRow } from "./user-row";

export const metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const [{ data: allowed }, { data: profiles }] = await Promise.all([
    supabase.from("allowed_emails").select("email, role, created_at").order("created_at"),
    supabase.from("profiles").select("email, name, created_at"),
  ]);
  const byEmail = new Map((profiles ?? []).map((p) => [p.email.toLowerCase(), p]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Usuários"
        description="Só os e-mails desta lista entram no painel. Remover alguém daqui revoga o acesso imediatamente."
      />

      <section className="rounded-lg border border-rule bg-paper p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Convidar pessoa</h2>
        <ActionForm action={inviteUser} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="field">
            E-mail
            <input name="email" type="email" inputMode="email" autoComplete="off" className="input" required placeholder="nome@exemplo.com" />
          </label>
          <label className="field">
            Papel
            <select name="role" className="input" defaultValue="colunista">
              <option value="colunista">Colunista</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <SubmitButton className="btn-primary">Autorizar</SubmitButton>
        </ActionForm>
        <dl className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">
          <div><dt className="font-semibold text-ink-soft">Colunista</dt><dd>Escreve rascunhos e edita só os próprios.</dd></div>
          <div><dt className="font-semibold text-ink-soft">Editor</dt><dd>Edita e publica qualquer texto.</dd></div>
          <div><dt className="font-semibold text-ink-soft">Administrador</dt><dd>Tudo, inclusive gerenciar usuários.</dd></div>
        </dl>
      </section>

      <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-paper">
        {allowed?.map((u) => {
          const p = byEmail.get(u.email);
          return (
            <UserRow
              key={u.email}
              email={u.email}
              role={u.role as Role}
              name={p?.name ?? null}
              status={p ? `Entrou pela primeira vez em ${formatDate(p.created_at)}` : "Ainda não entrou"}
              isMe={u.email === me.email.toLowerCase()}
              roleLabels={ROLE_LABEL}
            />
          );
        })}
      </ul>
    </div>
  );
}
