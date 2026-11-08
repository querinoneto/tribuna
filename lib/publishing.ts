import { validateTransition } from "./permissions";
import type { ArticleStatus, Role } from "./types";
import { publishProblems, type ArticleInput } from "./validation";

export type TransitionPlan =
  | { ok: true; patch: { status: ArticleStatus; scheduled_at: string | null; published_at?: string | null } }
  | { ok: false; error: string };

/**
 * Decide o que gravar no banco quando alguém clica em Publicar, Agendar,
 * Voltar para rascunho ou Arquivar. Função pura (testada em
 * tests/unit/publishing.test.ts); o banco aplica as mesmas regras de novo.
 */
export function planTransition(params: {
  role: Role | null;
  target: ArticleStatus;
  input: ArticleInput;
  scheduledAt?: string | null;
  currentPublishedAt?: string | null;
  now?: Date;
}): TransitionPlan {
  const { role, target, input, now = new Date() } = params;
  const when = params.scheduledAt ? new Date(params.scheduledAt) : null;

  const denied = validateTransition(role, target, when, now);
  if (denied) return { ok: false, error: denied };

  if (target === "published" || target === "scheduled") {
    const problems = publishProblems(input);
    if (problems.length) return { ok: false, error: `Antes de publicar: ${problems.join(" ")}` };
  }

  switch (target) {
    case "published":
      // Republicar um texto mantém a data original; publicar pela primeira vez usa agora.
      return {
        ok: true,
        patch: { status: "published", scheduled_at: null, published_at: params.currentPublishedAt ?? now.toISOString() },
      };
    case "scheduled":
      return { ok: true, patch: { status: "scheduled", scheduled_at: when!.toISOString() } };
    case "draft":
      return { ok: true, patch: { status: "draft", scheduled_at: null, published_at: null } };
    case "archived":
      return { ok: true, patch: { status: "archived", scheduled_at: null } };
  }
}

/** Mensagem amigável para erros que vêm do banco. */
export function dbErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "Erro desconhecido.";
  if (error.code === "23505") return "Já existe um texto com esse endereço (URL). Altere o campo “Endereço”.";
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
    return error.message && !/row-level security/i.test(error.message)
      ? error.message
      : "Você não tem permissão para fazer isso.";
  }
  if (error.code === "23514") return error.message ?? "Algum campo tem um valor inválido.";
  return "Não foi possível salvar agora. Verifique sua conexão e tente de novo.";
}
