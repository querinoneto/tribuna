import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { isOwnMediaUrl } from "@/lib/env";

/**
 * Card do feed do Instagram (retrato 4:5, 1080 × 1350), no mesmo modelo
 * aprovado: foto de capa em cima com o logotipo centralizado, filete
 * vermelho e, embaixo, a faixa preta com editoria, título, linha fina,
 * assinatura e o endereço do site. Sai em JPEG (único formato aceito
 * pela API do Instagram).
 */

export const CARD_SIZE = { width: 1080, height: 1350 };

// Fundo preto, letra branca; o vermelho é o mesmo do logotipo (#970512).
// Esse vermelho, sozinho sobre o preto, tem pouco contraste: por isso a
// editoria vai em letra branca sobre uma etiqueta vermelha (legível).
const C = { band: "#0a0a0a", ink: "#ffffff", soft: "#dcdcdc", muted: "#a9a9a9", red: "#970512", rule: "#2e2e2e" };

type Font = { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" };
let fontsPromise: Promise<Font[]> | null = null;
function fonts() {
  fontsPromise ??= (async () => {
    const dir = join(process.cwd(), "assets/og");
    const f = (n: string) => readFile(join(dir, n));
    const [s600, s700, serif400] = await Promise.all([
      f("inter-tight-latin-600-normal.woff"),
      f("inter-tight-latin-700-normal.woff"),
      f("newsreader-latin-400-normal.woff"),
    ]);
    return [
      { name: "Sans", data: s600, weight: 600, style: "normal" },
      { name: "Sans", data: s700, weight: 700, style: "normal" },
      { name: "Serif", data: serif400, weight: 400, style: "normal" },
    ];
  })();
  return fontsPromise;
}

const toDataUrl = (buf: Buffer, mime: string) => `data:${mime};base64,${buf.toString("base64")}`;

async function photo(url: string | null, width: number, height: number): Promise<string | null> {
  // Só baixa imagens do próprio Storage (nada de endereços arbitrários)
  if (!url || !isOwnMediaUrl(url)) return null;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 86 })
      .toBuffer();
    return toDataUrl(jpg, "image/jpeg");
  } catch {
    return null;
  }
}

/** Corta no limite de palavras, com reticências, para o texto caber no card. */
export function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : t.slice(0, max)).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** Tamanho do título e da linha fina conforme o volume de texto. */
export function cardSizes(title: string, subtitle: string) {
  const n = title.length;
  const titleSize = n > 120 ? 46 : n > 90 ? 52 : n > 60 ? 58 : 64;
  const subSize = subtitle.length > 180 || n > 90 ? 28 : 32;
  return { titleSize, subSize };
}

export async function instagramCard(a: {
  title: string;
  subtitle: string | null;
  section: string | null;
  author: string | null;
  cover_url: string | null;
  domain: string;
}): Promise<Buffer> {
  const title = clip(a.title, 150);
  const subtitle = a.subtitle ? clip(a.subtitle, a.title.length > 90 ? 160 : 220) : "";
  const { titleSize, subSize } = cardSizes(title, subtitle);

  // Altura aproximada do bloco de texto, para a foto ocupar o resto
  const charsPerLine = (size: number) => Math.floor(936 / (size * 0.5));
  const lines = (text: string, size: number) => (text ? Math.ceil(text.length / charsPerLine(size)) : 0);
  const textH =
    48 + 30 + 20 + lines(title, titleSize) * titleSize * 1.08 + (subtitle ? 18 + lines(subtitle, subSize) * subSize * 1.32 : 0) + 36 + 58 + 56;
  const photoH = Math.max(520, Math.round(CARD_SIZE.height - textH - 4));

  const [cover, mark, fontList] = await Promise.all([
    photo(a.cover_url, CARD_SIZE.width, photoH),
    readFile(join(process.cwd(), "public/logo.png")).then((b) => toDataUrl(b, "image/png")),
    fonts(),
  ]);

  const png = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.band, color: C.ink, fontFamily: "Sans" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            flexGrow: 1,
            minHeight: 520,
            background: cover ? C.band : "#1a1a1a",
            borderBottom: `4px solid ${C.red}`,
            overflow: "hidden",
          }}
        >
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" width={CARD_SIZE.width} height={photoH} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mark}
            alt=""
            width={cover ? 96 : 200}
            height={cover ? 96 : 200}
            style={
              cover
                ? { position: "absolute", top: 40, borderRadius: 999, boxShadow: "0 4px 14px rgba(0,0,0,.45)" }
                : { alignSelf: "center", borderRadius: 999 }
            }
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "48px 72px 56px" }}>
          {a.section && (
            <div style={{ display: "flex" }}>
              <div
                style={{
                  display: "flex",
                  background: C.red,
                  color: "#ffffff",
                  padding: "10px 22px",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 3.8,
                  textTransform: "uppercase",
                }}
              >
                {a.section}
              </div>
            </div>
          )}
          <div style={{ marginTop: a.section ? 24 : 0, fontSize: titleSize, fontWeight: 700, lineHeight: 1.08, letterSpacing: titleSize * -0.025 }}>{title}</div>
          {subtitle && <div style={{ marginTop: 18, fontFamily: "Serif", fontSize: subSize, lineHeight: 1.32, color: C.soft }}>{subtitle}</div>}
          <div
            style={{
              marginTop: 36,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderTop: `1px solid ${C.rule}`,
              paddingTop: 22,
              fontSize: 24,
              color: C.muted,
            }}
          >
            <span style={{ display: "flex" }}>
              Por&nbsp;<span style={{ color: C.ink, fontWeight: 600 }}>{a.author || "Tribuna Socialista"}</span>
            </span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{a.domain}</span>
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts: fontList },
  );

  return sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
