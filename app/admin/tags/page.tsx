import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { deleteTag, saveTag } from "../crud-actions";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { data: tags } = await supabase.from("tags").select("id, name, slug, article_tags(count)").order("name");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Tags" description="Palavras-chave que ligam textos sobre o mesmo assunto. Também são criadas automaticamente no editor." />

      <section className="rounded-lg border border-rule bg-paper p-4 sm:p-5">
        <ActionForm action={saveTag} resetOnSuccess className="flex flex-wrap items-end gap-3">
          <label className="field min-w-48 flex-1">
            Nova tag
            <input name="name" className="input" required maxLength={60} placeholder="ex.: reforma agrária" />
          </label>
          <SubmitButton className="btn-primary">Criar</SubmitButton>
        </ActionForm>
      </section>

      {tags && tags.length > 0 ? (
        <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-paper">
          {tags.map((t) => {
            const n = (t.article_tags as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <li key={t.id} className="p-3 sm:px-4">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <span className="flex-1">
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 text-sm text-muted">{n} {n === 1 ? "texto" : "textos"}</span>
                    </span>
                    <span className="btn-ghost text-sm">Editar</span>
                    <DeleteButton action={deleteTag.bind(null, t.id)} label={`Excluir a tag ${t.name}`} title={`Excluir a tag “${t.name}”?`} description="Os textos não serão apagados; só perdem esta tag." />
                  </summary>
                  <ActionForm action={saveTag} className="mt-3 grid gap-3 border-t border-rule pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <input type="hidden" name="id" value={t.id} />
                    <label className="field">
                      Nome
                      <input name="name" className="input" defaultValue={t.name} required />
                    </label>
                    <label className="field">
                      Endereço
                      <input name="slug" className="input" defaultValue={t.slug} />
                    </label>
                    <SubmitButton className="btn-primary">Salvar</SubmitButton>
                  </ActionForm>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted">Nenhuma tag ainda.</p>
      )}
    </div>
  );
}
