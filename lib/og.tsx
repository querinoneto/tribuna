import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

/**
 * Miniatura de compartilhamento (WhatsApp, Facebook, X, LinkedIn...).
 * 1200 × 630, em JPEG leve (o WhatsApp ignora imagens grandes ou em WebP):
 * foto de capa à direita e, à esquerda, a faixa escura do jornal com a
 * marca, a editoria, o título e a assinatura.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const C = { band: "#1a1a1a", ink: "#faf8f5", muted: "#b8b2aa", accent: "#f0716b", red: "#b3201f" };

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }[]> | null = null;
function fonts() {
  fontsPromise ??= (async () => {
    const dir = join(process.cwd(), "assets/og");
    const [sans500, sans700, serif700] = await Promise.all([
      readFile(join(dir, "inter-tight-latin-500-normal.woff")),
      readFile(join(dir, "inter-tight-latin-700-normal.woff")),
      readFile(join(dir, "newsreader-latin-700-normal.woff")),
    ]);
    return [
      { name: "Sans", data: sans500, weight: 500 as const, style: "normal" as const },
      { name: "Sans", data: sans700, weight: 700 as const, style: "normal" as const },
      { name: "Serif", data: serif700, weight: 700 as const, style: "normal" as const },
    ];
  })();
  return fontsPromise;
}

async function dataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Baixa a capa e converte para JPEG no tamanho certo (aceita WebP, PNG, AVIF...). */
async function coverImage(url: string | null, width: number, height: number): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return dataUrl(jpg, "image/jpeg");
  } catch {
    return null;
  }
}

async function logo(): Promise<string> {
  return dataUrl(await readFile(join(process.cwd(), "public/logo.png")), "image/png");
}

/** Tamanho do título conforme o comprimento, para caber sem cortar. */
function titleSize(title: string, wide: boolean) {
  const n = title.length;
  if (wide) return n > 110 ? 52 : n > 70 ? 62 : 72;
  return n > 110 ? 38 : n > 80 ? 44 : n > 50 ? 50 : 56;
}

export async function articleOgImage(a: {
  title: string;
  section: string | null;
  author: string | null;
  cover_url: string | null;
  domain: string;
}): Promise<Response> {
  const photoW = 560;
  const [cover, mark, fontList] = await Promise.all([coverImage(a.cover_url, photoW, OG_SIZE.height), logo(), fonts()]);
  const wide = !cover;

  const png = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.band, color: C.ink, fontFamily: "Sans" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "52px 56px 0 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} width={56} height={56} alt="" />
            <span style={{ fontFamily: "Serif", fontSize: 34, fontWeight: 700, letterSpacing: -0.8 }}>Tribuna Socialista</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
            {a.section && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, color: C.accent, fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
                <div style={{ width: 40, height: 3, background: C.accent }} />
                {a.section}
              </div>
            )}
            <div style={{ marginTop: 18, fontSize: titleSize(a.title, wide), fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.2 }}>{a.title}</div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #3a3734",
              padding: "20px 0 26px",
              fontSize: 22,
              color: C.muted,
            }}
          >
            <span style={{ display: "flex" }}>
              {a.author ? (
                <>
                  Por&nbsp;<span style={{ color: C.ink, fontWeight: 700 }}>{a.author}</span>
                </>
              ) : (
                ""
              )}
            </span>
            <span style={{ color: C.ink, fontWeight: 700 }}>{a.domain}</span>
          </div>
        </div>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} width={photoW} height={OG_SIZE.height} alt="" style={{ objectFit: "cover" }} />
        )}

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: C.red }} />
      </div>
    ),
    { ...OG_SIZE, fonts: fontList },
  );

  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
