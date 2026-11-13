import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import sharp from "sharp";

/**
 * Captcha próprio (sem serviço externo): uma imagem com 5 algarismos
 * desenhados à mão, tortos e riscados, que a pessoa digita.
 *
 * Não guarda nada no servidor: a resposta vai "lacrada" num código
 * (exp.nonce.assinatura) que só o servidor consegue conferir. O código vale
 * 15 minutos e só é aceito depois de 3 segundos (robôs respondem na hora).
 * A imagem sai em PNG: os algarismos não estão escritos em lugar nenhum da
 * página, só desenhados.
 */
const TTL = 15 * 60_000;
const MIN_AGE = 3_000;
const LENGTH = 5;

let devSecret: string | null = null;
function secret(): string {
  const s = process.env.CAPTCHA_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET;
  if (s) return s;
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}

const sign = (exp: number, nonce: string, answer: string) =>
  createHmac("sha256", `captcha:${secret()}`).update(`${exp}.${nonce}.${answer}`).digest("base64url");

// Algarismos como traços numa grade de 10 × 16
const GLYPHS: Record<string, number[][][]> = {
  "0": [[[5, 1], [8, 2], [9, 5], [9, 11], [8, 14], [5, 15], [2, 14], [1, 11], [1, 5], [2, 2], [5, 1]]],
  "1": [[[2, 4], [6, 1], [6, 15]], [[2, 15], [9, 15]]],
  "2": [[[1, 4], [3, 1], [7, 1], [9, 4], [9, 6], [1, 15], [9, 15]]],
  "3": [[[1, 3], [4, 1], [7, 1], [9, 3], [8, 6], [4, 8], [8, 9], [9, 12], [7, 15], [3, 15], [1, 13]]],
  "4": [[[7, 15], [7, 1], [1, 11], [9, 11]]],
  "5": [[[9, 1], [2, 1], [1, 7], [6, 6], [9, 9], [9, 12], [6, 15], [1, 14]]],
  "6": [[[8, 1], [4, 3], [1, 9], [1, 13], [4, 15], [7, 15], [9, 12], [8, 9], [5, 8], [1, 10]]],
  "7": [[[1, 1], [9, 1], [4, 15]], [[3, 8], [8, 8]]],
  "8": [[[5, 8], [2, 6], [2, 3], [5, 1], [8, 3], [8, 6], [5, 8], [1, 11], [2, 14], [5, 15], [8, 14], [9, 11], [5, 8]]],
  "9": [[[9, 6], [6, 8], [3, 7], [1, 4], [3, 1], [7, 1], [9, 4], [9, 8], [6, 15], [2, 15]]],
};

const W = 240;
const H = 80;
const r = (min: number, max: number) => min + Math.random() * (max - min);

function drawing(code: string): string {
  const parts: string[] = [];
  // Fundo com ruído
  for (let i = 0; i < 40; i++) parts.push(`<circle cx="${r(0, W).toFixed(1)}" cy="${r(0, H).toFixed(1)}" r="${r(0.8, 2.2).toFixed(1)}" fill="#8a837c" opacity="${r(0.25, 0.6).toFixed(2)}"/>`);
  for (let i = 0; i < 5; i++) {
    parts.push(
      `<path d="M${r(0, 40).toFixed(1)} ${r(0, H).toFixed(1)} C ${r(40, 120).toFixed(1)} ${r(0, H).toFixed(1)}, ${r(120, 200).toFixed(1)} ${r(0, H).toFixed(1)}, ${r(200, W).toFixed(1)} ${r(0, H).toFixed(1)}" stroke="#9c948c" stroke-width="${r(1.2, 2.2).toFixed(1)}" fill="none"/>`,
    );
  }
  // Algarismos tortos
  [...code].forEach((ch, i) => {
    const sx = r(2.4, 3.1);
    const sy = r(2.9, 3.5);
    const x = 18 + i * 42 + r(-4, 4);
    const y = 12 + r(-5, 5);
    const rot = r(-22, 22);
    const d = GLYPHS[ch]
      .map((stroke) => stroke.map(([px, py], k) => `${k ? "L" : "M"}${(px + r(-0.35, 0.35)).toFixed(2)} ${(py + r(-0.35, 0.35)).toFixed(2)}`).join(" "))
      .join(" ");
    parts.push(
      `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)} 15 24) scale(${sx.toFixed(2)} ${sy.toFixed(2)})" d="${d}" stroke="#1f1b18" stroke-width="${r(2.6, 3.2).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"/>`,
    );
  });
  // Risco por cima dos algarismos
  parts.push(
    `<path d="M5 ${r(25, 55).toFixed(1)} Q ${W / 2} ${r(0, H).toFixed(1)} ${W - 5} ${r(25, 55).toFixed(1)}" stroke="#1f1b18" stroke-width="2" fill="none" opacity="0.7"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f4f1ec"/>${parts.join("")}</svg>`;
}

export type Captcha = { image: string; token: string; width: number; height: number };

export async function createCaptcha(): Promise<Captcha> {
  const code = Array.from({ length: LENGTH }, () => String(randomInt(0, 10))).join("");
  const exp = Date.now() + TTL;
  const nonce = randomBytes(9).toString("base64url");
  const png = await sharp(Buffer.from(drawing(code)), { density: 144 }).resize(W, H).png().toBuffer();
  return { image: `data:image/png;base64,${png.toString("base64")}`, token: `${exp}.${nonce}.${sign(exp, nonce, code)}`, width: W, height: H };
}

export type CaptchaCheck = "ok" | "faltando" | "errado" | "expirado" | "rapido";

export function checkCaptcha(token: unknown, answer: unknown, now = Date.now()): CaptchaCheck {
  const t = String(token ?? "");
  const a = String(answer ?? "").replace(/\D/g, "");
  if (!t || !a) return "faltando";
  const [expStr, nonce, mac] = t.split(".");
  const exp = Number(expStr);
  if (!exp || !nonce || !mac) return "errado";
  if (now > exp) return "expirado";
  if (now < exp - TTL + MIN_AGE) return "rapido";
  const expected = Buffer.from(sign(exp, nonce, a));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? "ok" : "errado";
}

export const CAPTCHA_MESSAGES: Record<Exclude<CaptchaCheck, "ok">, string> = {
  faltando: "Digite os números da imagem.",
  errado: "Os números não conferem com a imagem. Tente de novo com a imagem nova.",
  expirado: "A imagem expirou. Digite os números da imagem nova.",
  rapido: "Envio rápido demais. Confira os campos e envie de novo.",
};
