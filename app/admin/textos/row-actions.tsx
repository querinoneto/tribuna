"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { IconExternal, IconTrash } from "@/components/icons";
import { deleteArticle } from "./actions";

export function ArticleRowActions({
  id,
  viewHref,
  canEdit,
  title,
}: {
  id: string;
  viewHref: string | null;
  canEdit: boolean;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/textos/${id}`} className="btn-ghost px-3">
        {canEdit ? "Editar" : "Abrir"}
      </Link>
      {viewHref && (
        <a href={viewHref} target="_blank" rel="noopener" className="btn-ghost size-11 p-0" aria-label={`Ver “${title}” no site`}>
          <IconExternal />
        </a>
      )}
      {canEdit && (
        <ConfirmButton
          className="btn-ghost size-11 p-0 text-accent"
          ariaLabel={`Excluir “${title || "sem título"}”`}
          title="Excluir definitivamente?"
          description={`“${title || "Sem título"}” será apagado e não poderá ser recuperado.`}
          confirmLabel="Excluir"
          onConfirm={async () => {
            const r = await deleteArticle(id);
            if (r.ok) {
              toast("success", "Texto excluído.");
              router.refresh();
            } else toast("error", r.error ?? "Não foi possível excluir.");
          }}
        >
          <IconTrash />
        </ConfirmButton>
      )}
    </div>
  );
}
