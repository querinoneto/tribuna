import { createArticle } from "@/app/admin/textos/actions";
import { IconPlus } from "@/components/icons";
import { SubmitButton } from "./submit-button";

/** Formulário de um botão só: cria o rascunho no servidor e abre o editor. */
export function NewArticleButton({ className = "btn-primary h-12 px-5 text-base" }: { className?: string }) {
  return (
    <form action={createArticle}>
      <SubmitButton className={className} pendingText="Criando…">
        <IconPlus /> Novo texto
      </SubmitButton>
    </form>
  );
}
