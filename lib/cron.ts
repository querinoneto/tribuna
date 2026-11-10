import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Confere o cabeçalho "Authorization: Bearer <CRON_SECRET>" enviado pela
 * Vercel Cron. Comparação em tempo constante (não revela a senha aos poucos).
 */
export function isCronAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
