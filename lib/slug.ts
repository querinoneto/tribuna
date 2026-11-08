/** "Meio Ambiente: o rio São Francisco!" → "meio-ambiente-o-rio-sao-francisco" */
export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug;
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
