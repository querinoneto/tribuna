import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Exporta todos os inscritos em CSV (somente administradores). */
export async function GET() {
  const staff = await getStaff();
  if (!staff || staff.role !== "admin") {
    return new NextResponse("Acesso não autorizado.", { status: 403 });
  }

  const supabase = await createClient();
  const rows: { email: string; created_at: string }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("email, created_at")
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) return new NextResponse("Erro ao exportar.", { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  // Evita injeção de fórmulas ao abrir no Excel/Planilhas
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = "﻿" + ["email,inscrito_em", ...rows.map((r) => `${cell(r.email)},${cell(r.created_at)}`)].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assinaturas-tribuna-socialista-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
