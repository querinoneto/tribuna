import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { deleteSection, saveSection } from "../crud-actions";

export const metadata = { title: "Editorias" };

function Fields({ s }: { s?: { id: string; name: string; slug: string; description: string | null; position: number } }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
        <label className="field">
          Nome
          <input name="name" className="input" defaultValue={s?.name} required maxLength={60} />
        </label>
        <label className="field">
          Endereço
          <input name="slug" className="input" defaultValue={s?.slug} placeholder="gerado a partir do nome" />
        </label>
        <label className="field">
          Ordem no menu
          <input name="position" type="number" min={0} className="input" defaultValue={s?.position ?? 0} />
        </label>
      </div>
      <label className="field mt-3">
        Descrição (aparece na página da editoria)
        <input name="description" className="input" defaultValue={s?.description ?? ""} maxLength={300} />
      </label>
    </>
  );
}

export default async function EditoriasPage() {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { data: sections } = await supabase.from("sections").select("*").order("position");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Editorias" description="As seções do jornal. A ordem define a posição no menu do site." />

      <section className="rounded-lg border border-rule bg-paper p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Nova editoria</h2>
        <ActionForm action={saveSection} resetOnSuccess>
          <Fields />
          <SubmitButton className="btn-primary mt-4">Criar editoria</SubmitButton>
        </ActionForm>
      </section>

      <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-paper">
        {sections?.map((s) => (
          <li key={s.id} className="p-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="w-8 text-center text-sm text-muted tabular-nums">{s.position}</span>
                <span className="flex-1">
                  <span className="font-sans text-lg font-semibold">{s.name}</span>
                  <span className="ml-2 text-sm text-muted">/editoria/{s.slug}</span>
                </span>
                <span className="btn-ghost text-sm group-open:hidden">Editar</span>
                <span className="btn-ghost hidden text-sm group-open:inline-flex">Fechar</span>
                <DeleteButton
                  action={deleteSection.bind(null, s.id)}
                  label={`Excluir a editoria ${s.name}`}
                  title={`Excluir a editoria “${s.name}”?`}
                  description="Os textos desta editoria não serão apagados, mas ficarão sem editoria."
                />
              </summary>
              <ActionForm action={saveSection} className="mt-4 border-t border-rule pt-4">
                <Fields s={s} />
                <SubmitButton className="btn-primary mt-4">Salvar</SubmitButton>
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
