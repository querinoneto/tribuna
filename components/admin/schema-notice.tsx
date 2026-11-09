import { AdminNotice } from "./notice";

/** O banco ainda não recebeu a atualização mais recente (coluna inexistente). */
export function isOutdatedSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .* does not exist|could not find .* column/i.test(error.message ?? "");
}

export function SchemaNotice() {
  return (
    <AdminNotice tone="error">
      <strong>O banco de dados precisa de uma atualização.</strong> No Supabase, abra o SQL Editor, cole o conteúdo do arquivo{" "}
      <code>supabase/migrations/20261108000007_autores_revisao_contato.sql</code> e clique em Run. Até lá, a revisão de textos, o Contato e a
      Produção não funcionam.
    </AdminNotice>
  );
}
