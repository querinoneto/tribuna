import { TIMEZONE } from "./env";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: TIMEZONE });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE,
});
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIMEZONE,
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE });
const shortFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE,
});

/** "8 de novembro de 2026" */
export function formatDate(d: string | Date): string {
  return dateFmt.format(new Date(d));
}

/** "8 de novembro de 2026, 9h30" */
export function formatDateTime(d: string | Date): string {
  const parts = dateTimeFmt.formatToParts(new Date(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} de ${get("month")} de ${get("year")}, ${get("hour")}h${get("minute")}`;
}

/** "Domingo, 8 de novembro de 2026" */
export function formatToday(d: Date): string {
  const s = weekdayFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "14:32" */
export function formatTime(d: string | Date): string {
  return timeFmt.format(new Date(d));
}

/** "08/11/2026 14:32" */
export function formatShort(d: string | Date): string {
  return shortFmt.format(new Date(d)).replace(",", "");
}

/** Ano e mês (com dois dígitos) no fuso do jornal, para a URL da matéria. */
export function yearMonth(d: string | Date): { ano: string; mes: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TIMEZONE }).formatToParts(
    new Date(d),
  );
  return {
    ano: parts.find((p) => p.type === "year")!.value,
    mes: parts.find((p) => p.type === "month")!.value,
  };
}

export function articlePath(a: { slug: string; published_at: string | null }): string {
  if (!a.published_at) return `/materia/${a.slug}`;
  const { ano, mes } = yearMonth(a.published_at);
  return `/${ano}/${mes}/${a.slug}`;
}

export function readingTime(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A coluna aparece sempre como "Coluna: Nome", para não ser confundida com uma editoria. */
export function columnLabel(name: string) {
  return `Coluna: ${name}`;
}
