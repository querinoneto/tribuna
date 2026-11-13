/**
 * Limpeza de texto enviado por visitantes (Contato e Envios de leitores).
 *
 * Remove caracteres invisíveis que servem para esconder conteúdo: espaços de
 * largura zero, controles de direção do texto (que fazem um trecho aparecer
 * de trás para frente), caracteres "tag" (U+E0000–U+E007F, usados para
 * esconder instruções lidas por programas de IA, mas invisíveis na tela) e
 * caracteres de controle. Também normaliza letras "disfarçadas" (largura
 * total, estilizadas) para a forma comum (NFKC). Quebras de linha e
 * tabulações são mantidas; emojis também.
 */
const HIDDEN = /[­᠎​-‏‪-‮⁠-⁯﻿￹-￻]|[\u{E0000}-\u{E007F}]|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;

export function hasHiddenCharacters(s: string): boolean {
  HIDDEN.lastIndex = 0;
  return HIDDEN.test(s);
}

export function cleanVisitorText(s: string): string {
  return s.normalize("NFKC").replace(HIDDEN, "").replace(/\r\n?/g, "\n");
}

/** Quantos links (http/https/www) o texto tem: muitos links são sinal de spam. */
export function countLinks(s: string): number {
  return (s.match(/\bhttps?:\/\/|\bwww\./gi) ?? []).length;
}
