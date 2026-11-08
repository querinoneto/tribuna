import type { ArticleStatus, Role } from "./types";

/**
 * Regras de permissão usadas na interface e nas Server Actions.
 * Espelham as políticas RLS do banco (supabase/migrations/*_rls.sql), que
 * continuam sendo a proteção definitiva: esconder um botão nunca basta.
 */

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  colunista: "Colunista",
};

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  scheduled: "Agendado",
  archived: "Arquivado",
};

export function canPublish(role: Role | null): boolean {
  return role === "admin" || role === "editor";
}

export function canManageUsers(role: Role | null): boolean {
  return role === "admin";
}

export function canManageTaxonomy(role: Role | null): boolean {
  return role === "admin" || role === "editor";
}

export function canSeeSubscribers(role: Role | null): boolean {
  return role === "admin";
}

export function canEditArticle(
  role: Role | null,
  userId: string | null,
  article: { created_by: string | null; status: ArticleStatus },
): boolean {
  if (!role || !userId) return false;
  if (role === "admin" || role === "editor") return true;
  return article.created_by === userId && article.status === "draft";
}

export function canDeleteArticle(
  role: Role | null,
  userId: string | null,
  article: { created_by: string | null; status: ArticleStatus },
): boolean {
  return canEditArticle(role, userId, article);
}

/** Estados para os quais cada papel pode levar um texto. */
export function allowedStatuses(role: Role | null): ArticleStatus[] {
  if (role === "admin" || role === "editor") return ["draft", "published", "scheduled", "archived"];
  if (role === "colunista") return ["draft"];
  return [];
}

/**
 * Valida uma transição de estado e devolve a mensagem de erro em português,
 * ou null se estiver tudo certo.
 */
export function validateTransition(
  role: Role | null,
  target: ArticleStatus,
  scheduledAt: Date | null,
  now: Date = new Date(),
): string | null {
  if (!allowedStatuses(role).includes(target)) {
    return "Seu papel não permite publicar, agendar ou arquivar textos. Salve como rascunho e peça a revisão de um editor.";
  }
  if (target === "scheduled") {
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return "Escolha a data e a hora da publicação.";
    if (scheduledAt.getTime() <= now.getTime()) return "A data do agendamento precisa estar no futuro.";
  }
  return null;
}

/** O texto já aparece para o público? */
export function isPubliclyVisible(
  a: { status: ArticleStatus; published_at: string | null },
  now: Date = new Date(),
): boolean {
  return (
    (a.status === "published" || a.status === "scheduled") &&
    a.published_at !== null &&
    new Date(a.published_at).getTime() <= now.getTime()
  );
}
