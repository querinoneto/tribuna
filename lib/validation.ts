import { z } from "zod";
import { SLUG_RE } from "./slug";

const slug = z
  .string()
  .trim()
  .min(1, "Informe o endereço (URL).")
  .max(100, "Endereço muito longo.")
  .regex(SLUG_RE, "Use apenas letras minúsculas, números e hífens (ex.: reforma-agraria-em-pauta).");

const optionalUuid = z
  .string()
  .uuid()
  .nullable()
  .or(z.literal("").transform(() => null));

export const articleSchema = z.object({
  title: z.string().trim().max(200, "O título pode ter no máximo 200 caracteres."),
  subtitle: z.string().trim().max(400, "A linha fina pode ter no máximo 400 caracteres."),
  slug,
  excerpt: z.string().trim().max(300, "O resumo para redes sociais pode ter no máximo 300 caracteres."),
  content_json: z.unknown().nullable(),
  content_html: z.string().max(500_000, "O texto ficou grande demais."),
  cover_url: z.string().url("Endereço da imagem inválido.").nullable().or(z.literal("").transform(() => null)),
  cover_alt: z.string().trim().max(300, "O texto alternativo pode ter no máximo 300 caracteres."),
  cover_caption: z.string().trim().max(400),
  cover_credit: z.string().trim().max(120),
  section_id: optionalUuid,
  author_id: optionalUuid,
  tags: z.array(z.string().trim().min(1).max(60)).max(15, "Use no máximo 15 tags."),
  featured: z.boolean(),
  pinned: z.boolean(),
});
export type ArticleInput = z.infer<typeof articleSchema>;

/** Regras extras para publicar ou agendar (o rascunho pode estar incompleto). */
export function publishProblems(a: ArticleInput): string[] {
  const p: string[] = [];
  if (a.title.length < 5) p.push("Escreva um título.");
  if (!a.section_id) p.push("Escolha a editoria.");
  if (!a.author_id) p.push("Escolha o autor.");
  if (a.content_html.replace(/<[^>]+>/g, "").trim().length < 20) p.push("O texto está vazio ou muito curto.");
  if (a.cover_url && a.cover_alt.length < 3) p.push("Descreva a imagem de capa no campo “Texto alternativo”.");
  return p;
}

export const statusSchema = z.object({
  status: z.enum(["draft", "published", "scheduled", "archived"]),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo.")
  .email("Digite um e-mail válido.");

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "editor", "colunista"], { message: "Escolha um papel." }),
});

export const sectionSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome à editoria.").max(60),
  slug,
  description: z.string().trim().max(300).optional().default(""),
  position: z.coerce.number().int().min(0).max(999).default(0),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à tag.").max(60),
  slug,
});

export const authorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  slug,
  bio: z.string().trim().max(600, "A biografia pode ter no máximo 600 caracteres.").optional().default(""),
  avatar_url: z
    .string()
    .url("Endereço da foto inválido.")
    .refine((u) => u.startsWith("https://"), "Use um endereço de imagem que comece com https://")
    .nullable()
    .or(z.literal("").transform(() => null))
    .optional(),
  is_columnist: z.boolean().default(false),
});

export const pageSchema = z.object({
  title: z.string().trim().min(2, "Dê um título à página.").max(120),
  content_json: z.unknown().nullable(),
  content_html: z.string().max(300_000),
});

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não aceito. Envie JPG, PNG, WebP, GIF ou AVIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) return "A imagem passa de 5 MB. Reduza o tamanho e tente de novo.";
  if (file.size === 0) return "O arquivo está vazio.";
  return null;
}

/** Junta as mensagens de erro do Zod numa frase legível. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Verifique os campos e tente de novo.";
}

/* ------------------------- Escreva e publique conosco ------------------------- */
export const TEXT_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const PHOTO_FILE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
export const MAX_TEXT_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function fileExtension(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export function validateTextFile(file: { name: string; size: number }): string | null {
  if (!TEXT_FILE_TYPES[fileExtension(file.name)]) return "Envie o texto em PDF ou Word (.pdf, .doc ou .docx).";
  if (file.size > MAX_TEXT_BYTES) return "O arquivo do texto passa de 10 MB.";
  if (file.size === 0) return "O arquivo do texto está vazio.";
  return null;
}

export function validatePhotoFile(file: { name: string; size: number }): string | null {
  if (!PHOTO_FILE_TYPES[fileExtension(file.name)]) return "Envie a foto em JPG, PNG ou WebP.";
  if (file.size > MAX_PHOTO_BYTES) return "A foto passa de 5 MB.";
  if (file.size === 0) return "O arquivo da foto está vazio.";
  return null;
}

export const submissionSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
    email: emailSchema,
    title: z.string().trim().max(200, "Título muito longo.").default(""),
    message: z.string().trim().max(2000, "A mensagem pode ter no máximo 2.000 caracteres.").default(""),
    first_time: z.boolean(),
    file_path: z.string().regex(/^recebidos\/[0-9a-f-]{36}\/texto\.(pdf|doc|docx)$/, "Envie o arquivo do texto."),
    file_name: z.string().max(200).default(""),
    photo_path: z
      .string()
      .regex(/^recebidos\/[0-9a-f-]{36}\/foto\.(jpg|jpeg|png|webp)$/)
      .nullable(),
    consent: z.literal(true, { message: "Para enviar, marque que concorda com a Política de privacidade." }),
  })
  .refine((v) => !v.first_time || v.photo_path, { message: "Como é sua primeira publicação, envie uma foto.", path: ["photo_path"] });
