"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ConfirmButton } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import type { Role } from "@/lib/types";
import { changeUserRole, removeUser } from "../crud-actions";

export function UserRow({
  email,
  role,
  name,
  status,
  isMe,
  roleLabels,
}: {
  email: string;
  role: Role;
  name: string | null;
  status: string;
  isMe: boolean;
  roleLabels: Record<Role, string>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {name ?? email} {isMe && <span className="text-xs text-muted">(você)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {name ? `${email} · ` : ""}
          {status}
        </p>
      </div>
      <label className="sr-only" htmlFor={`papel-${email}`}>
        Papel de {email}
      </label>
      <select
        id={`papel-${email}`}
        className="input w-auto"
        defaultValue={role}
        disabled={pending || isMe}
        onChange={(e) => {
          const value = e.target.value;
          start(async () => {
            const r = await changeUserRole(email, value);
            toast(r.ok ? "success" : "error", r.ok ? r.message! : r.error!);
            router.refresh();
          });
        }}
      >
        {(Object.keys(roleLabels) as Role[]).map((r) => (
          <option key={r} value={r}>
            {roleLabels[r]}
          </option>
        ))}
      </select>
      {!isMe && (
        <ConfirmButton
          className="btn-danger"
          title="Remover acesso?"
          description={`${email} não poderá mais entrar no painel e sairá de Autores e da página Colunistas. O nome, a foto, a biografia, a página pessoal e os textos continuam no ar.`}
          confirmLabel="Remover"
          onConfirm={async () => {
            const r = await removeUser(email);
            toast(r.ok ? "success" : "error", r.ok ? r.message! : r.error!);
            router.refresh();
          }}
        >
          Remover
        </ConfirmButton>
      )}
    </li>
  );
}
