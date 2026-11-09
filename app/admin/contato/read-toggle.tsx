"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { setMessageRead } from "./actions";

export function ReadToggle({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost text-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setMessageRead(id, !read);
          if (!r.ok) toast("error", r.error ?? "Erro.");
          router.refresh();
        })
      }
    >
      {read ? "Marcar como não lida" : "Marcar como lida"}
    </button>
  );
}
