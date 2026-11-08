import { cacheLife } from "next/cache";
import { getSections } from "@/lib/data/public";
import { formatToday } from "@/lib/format";
import { HeaderShell } from "./header-shell";

/** Data do dia no fuso do jornal (renovada a cada 15 minutos). */
async function today(): Promise<string> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  return formatToday(new Date());
}

export async function SiteHeader({ variant }: { variant: "home" | "compact" }) {
  const [sections, date] = await Promise.all([getSections(), today()]);
  return <HeaderShell variant={variant} sections={sections.map((s) => ({ name: s.name, slug: s.slug }))} date={date} />;
}

export function SiteHeaderStatic() {
  return <SiteHeader variant="compact" />;
}
