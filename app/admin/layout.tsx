import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { ToastProvider } from "@/components/admin/toast";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel | Tribuna Socialista" },
  robots: { index: false, follow: false },
};

/** O painel depende da sessão de quem está logado: pode esperar o servidor. */
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <ToastProvider>
      <AdminShell staff={{ name: staff.name, email: staff.email, role: staff.role, avatarUrl: staff.avatarUrl }}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
