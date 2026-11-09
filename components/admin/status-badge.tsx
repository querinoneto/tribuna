import { STATUS_LABEL } from "@/lib/permissions";
import type { ArticleStatus } from "@/lib/types";

const STYLES: Record<ArticleStatus, string> = {
  draft: "bg-paper-2 text-ink-soft",
  published: "bg-[#e3f1e7] text-[#1f5c33] dark:bg-[#1d3325] dark:text-[#9fd8b0]",
  scheduled: "bg-[#e6edf8] text-[#1f4170] dark:bg-[#1c2a40] dark:text-[#a9c4ec]",
  archived: "bg-paper-2 text-muted line-through decoration-1",
};
const REVIEW = "bg-[#fbeed3] text-[#7a4b06] dark:bg-[#3a2c12] dark:text-[#f0c879]";

/** Estado do texto. Rascunho enviado pelo colunista aparece como “Em revisão”. */
export function StatusBadge({ status, inReview = false }: { status: ArticleStatus; inReview?: boolean }) {
  const review = inReview && status === "draft";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${review ? REVIEW : STYLES[status]}`}>
      {review ? "Em revisão" : STATUS_LABEL[status]}
    </span>
  );
}
