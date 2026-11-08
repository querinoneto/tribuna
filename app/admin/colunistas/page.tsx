import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { deleteAuthor, saveAuthor } from "../crud-actions";

export const metadata = { title: "Colunistas e autores" };

type A = { id: string; name: string; slug: string; bio: string | null; avatar_url: string | null; is_columnist: boolean; profile_id: string | null };

function Fields({ a, profiles }: { a?: A; profiles: { id: string; name: string; email: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Nome
          <input name="name" className="input" defaultValue={a?.name} required maxLength={120} />
        </label>
        <label className="field">
          Endereço da página
          <input name="slug" className="input" defaultValue={a?.slug} placeholder="gerado a partir do nome" />
        </label>
      </div>
      <label className="field">
        Mini biografia
        <textarea name="bio" rows={3} className="input" defaultValue={a?.bio ?? ""} maxLength={600} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Foto (endereço da imagem)
          <input name="avatar_url" type="url" className="input" defaultValue={a?.avatar_url ?? ""} placeholder="Copie o link de uma imagem da Mídia" />
        </label>
        <label className="field">
          Conta ligada (para assinar os próprios textos)
          <select name="profile_id" className="input" defaultValue={a?.profile_id ?? ""}>
            <option value="">Nenhuma (colunista convidado)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.email})
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="is_columnist" defaultChecked={a?.is_columnist} className="size-5 accent-[var(--accent)]" />
        Mostrar na lista de colunistas do site
      </label>
    </div>
  );
}

export default async function ColunistasPage() {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const [{ data: authors }, { data: profiles }] = await Promise.all([
    supabase.from("authors").select("*").order("name"),
    supabase.from("profiles").select("id, name, email").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Colunistas e autores"
        description="Quem assina os textos. Colunistas convidados não precisam de conta; quem publica pelo painel pode ter a conta ligada à assinatura."
      />

      <section className="rounded-lg border border-rule bg-paper p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Novo autor</h2>
        <ActionForm action={saveAuthor} resetOnSuccess>
          <Fields profiles={profiles ?? []} />
          <SubmitButton className="btn-primary mt-4">Criar</SubmitButton>
        </ActionForm>
      </section>

      <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-paper">
        {(authors as A[] | null)?.map((a) => (
          <li key={a.id} className="p-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-lg">
                  {a.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-lg font-semibold">{a.name}</span>
                  <span className="text-xs text-muted">
                    {a.is_columnist ? "Colunista" : "Autor"} · /autor/{a.slug}
                  </span>
                </span>
                <span className="btn-ghost text-sm">Editar</span>
                <DeleteButton action={deleteAuthor.bind(null, a.id)} label={`Excluir ${a.name}`} title={`Excluir “${a.name}”?`} description="Os textos não serão apagados, mas ficarão sem assinatura." />
              </summary>
              <ActionForm action={saveAuthor} className="mt-4 border-t border-rule pt-4">
                <Fields a={a} profiles={profiles ?? []} />
                <SubmitButton className="btn-primary mt-4">Salvar</SubmitButton>
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
