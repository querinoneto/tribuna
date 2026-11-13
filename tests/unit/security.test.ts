import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { checkCaptcha, createCaptcha } from "@/lib/captcha";
import { inspectFile } from "@/lib/security/files";
import { cleanVisitorText, countLinks, hasHiddenCharacters } from "@/lib/security/text";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : Buffer.from(p)))));

describe("texto de visitantes", () => {
  it("remove caracteres invisíveis usados para esconder instruções", () => {
    const tagged = [..."ignore"].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("");
    const raw = `Olá​, tudo‮ bem?${tagged}\u0007\nFim`;
    expect(hasHiddenCharacters(raw)).toBe(true);
    expect(cleanVisitorText(raw)).toBe("Olá, tudo bem?\nFim");
  });
  it("mantém acentos, emojis e quebras de linha; normaliza letras disfarçadas", () => {
    expect(cleanVisitorText("Ｔｒｉｂｕｎａ ação 👍\r\nok")).toBe("Tribuna ação 👍\nok");
  });
  it("conta links", () => {
    expect(countLinks("veja https://a.com e www.b.com e http://c")).toBe(3);
  });
});

describe("arquivos enviados", () => {
  it("aceita PDF comum e recusa PDF com JavaScript ou arquivo embutido", () => {
    expect(inspectFile("x/texto.pdf", bytes("%PDF-1.7\n1 0 obj << /Type /Catalog >>"), "texto").ok).toBe(true);
    expect(inspectFile("x/texto.pdf", bytes("%PDF-1.7\n<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>"), "texto").ok).toBe(false);
    expect(inspectFile("x/texto.pdf", bytes("%PDF-1.7\n<< /EmbeddedFiles 3 0 R >>"), "texto").ok).toBe(false);
    expect(inspectFile("x/texto.pdf", bytes("MZ\x90\x00 executável"), "texto").ok).toBe(false);
  });
  it("aceita .docx comum e recusa com macros ou objeto embutido", () => {
    const zip = (name: string) => bytes([0x50, 0x4b, 0x03, 0x04], `....[Content_Types].xml word/document.xml ${name}`);
    expect(inspectFile("x/texto.docx", zip("word/styles.xml"), "texto").ok).toBe(true);
    expect(inspectFile("x/texto.docx", zip("word/vbaProject.bin"), "texto").ok).toBe(false);
    expect(inspectFile("x/texto.docx", zip("word/embeddings/oleObject1.bin"), "texto").ok).toBe(false);
    expect(inspectFile("x/texto.docx", bytes("%PDF-1.4 disfarçado"), "texto").ok).toBe(false);
  });
  it("recusa .doc com macros", () => {
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    expect(inspectFile("x/texto.doc", bytes(ole, "WordDocument"), "texto").ok).toBe(true);
    expect(inspectFile("x/texto.doc", bytes(ole, Buffer.from("_VBA_PROJECT", "utf16le").toString("latin1")), "texto").ok).toBe(false);
  });
  it("confere a foto pelo conteúdo, não pela extensão", () => {
    expect(inspectFile("x/foto.jpg", bytes([0xff, 0xd8, 0xff, 0xe0]), "foto").ok).toBe(true);
    expect(inspectFile("x/foto.png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "foto").ok).toBe(true);
    expect(inspectFile("x/foto.jpg", bytes("<svg onload=alert(1)>"), "foto").ok).toBe(false);
  });
});

describe("captcha", () => {
  it("gera imagem PNG e confere a resposta lacrada", async () => {
    const c = await createCaptcha();
    expect(c.image.startsWith("data:image/png;base64,")).toBe(true);
    const [exp] = c.token.split(".");
    const later = Number(exp) - 14 * 60_000;
    expect(checkCaptcha(c.token, "", later)).toBe("faltando");
    expect(checkCaptcha(c.token, "00000x", later)).toMatch(/errado|ok/);
    expect(checkCaptcha(c.token, "12345", Number(exp) - 15 * 60_000 + 500)).toBe("rapido");
    expect(checkCaptcha(c.token, "12345", Number(exp) + 1)).toBe("expirado");
    expect(checkCaptcha("lixo", "12345", later)).toBe("errado");
  });
  it("aceita só a resposta certa (descoberta testando as 100 mil combinações é inviável para o visitante, mas não para o teste)", async () => {
    const c = await createCaptcha();
    const later = Number(c.token.split(".")[0]) - 14 * 60_000;
    let right = 0;
    for (let n = 0; n < 100_000; n++) if (checkCaptcha(c.token, String(n).padStart(5, "0"), later) === "ok") right++;
    expect(right).toBe(1);
  });
});
