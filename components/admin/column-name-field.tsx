/** Campo "Nome da coluna" (opcional) para colunistas. */
export function ColumnNameField({ value }: { value: string }) {
  return (
    <label className="field">
      Nome da coluna <span className="font-normal text-muted">(opcional)</span>
      <input name="column_name" className="input" defaultValue={value} maxLength={60} placeholder="Ex.: Domingo no Parque" />
      <span className="text-xs font-normal text-muted">
        Se preenchido, a coluna ganha página própria e entra no menu do site, junto de Opinião. Sua assinatura continua sendo o seu nome. Deixe em
        branco para não ter coluna com nome.
      </span>
    </label>
  );
}
