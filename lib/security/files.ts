/**
 * Confere o conteúdo real dos arquivos enviados por leitores (Envios), em
 * vez de confiar na extensão ou no tipo informado pelo navegador:
 *
 * - PDF: precisa começar como PDF e não pode ter JavaScript, comandos que
 *   abrem programas (/Launch), arquivos embutidos nem mídia ativa;
 * - Word .docx: precisa ser um documento do Word de verdade e não pode ter
 *   macros (vbaProject), controles ActiveX nem objetos embutidos (OLE);
 * - Word .doc (antigo): não pode ter macros;
 * - foto: precisa ser JPEG, PNG ou WebP de verdade.
 *
 * Função pura (testada em tests/unit/security.test.ts).
 */
export type FileKind = "texto" | "foto";
export type Inspection = { ok: true } | { ok: false; reason: string };

const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf: Uint8Array) => Buffer.from(buf).toString("latin1");
const utf16 = (s: string) => Buffer.from(s, "utf16le").toString("latin1");

export function inspectFile(path: string, buf: Uint8Array, kind: FileKind): Inspection {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (!buf.length) return { ok: false, reason: "o arquivo está vazio" };

  if (kind === "foto") {
    const jpeg = startsWith(buf, [0xff, 0xd8, 0xff]);
    const png = startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8);
    const ok = (ext === "png" && png) || (ext === "webp" && webp) || ((ext === "jpg" || ext === "jpeg") && jpeg);
    return ok ? { ok: true } : { ok: false, reason: "a foto não é uma imagem JPG, PNG ou WebP válida" };
  }

  const text = ascii(buf);
  if (ext === "pdf") {
    if (!text.slice(0, 1024).includes("%PDF-")) return { ok: false, reason: "o arquivo não é um PDF válido" };
    if (/\/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia|XFA)\b/.test(text)) {
      return { ok: false, reason: "o PDF tem conteúdo ativo (scripts, arquivos embutidos ou comandos)" };
    }
    return { ok: true };
  }
  if (ext === "docx") {
    if (!startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || !text.includes("word/document.xml")) {
      return { ok: false, reason: "o arquivo não é um documento do Word (.docx) válido" };
    }
    if (/vbaProject|vbaData|macroEnabled|activeX|word\/embeddings\/|oleObject/i.test(text)) {
      return { ok: false, reason: "o documento tem macros ou objetos embutidos" };
    }
    return { ok: true };
  }
  if (ext === "doc") {
    if (!startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
      return { ok: false, reason: "o arquivo não é um documento do Word (.doc) válido" };
    }
    if ([utf16("_VBA_PROJECT"), utf16("Macros"), utf16("VBA"), "_VBA_PROJECT"].some((m) => text.includes(m))) {
      return { ok: false, reason: "o documento tem macros" };
    }
    return { ok: true };
  }
  return { ok: false, reason: "formato de arquivo não aceito" };
}
