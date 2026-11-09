import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: author } = await supabase
    .from("authors")
    .select("id, name, slug, bio, avatar_url, is_columnist")
    .eq("profile_id", staff.id)
    .maybeSingle();
  const { data: column } = author
    ? await supabase.from("columns").select("name").eq("author_id", author.id).maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Meu perfil"
        description="Sua foto, seu nome e sua biografia, como aparecem na assinatura dos seus textos no site."
      />
      <section className="rounded-lg border border-rule bg-paper p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted">
          {staff.email} · {ROLE_LABEL[staff.role]}
          {author?.is_columnist && (
            <>
              {" · "}
              <Link href={`/autor/${author.slug}`} target="_blank" className="underline underline-offset-2 hover:text-ink">
                ver minha página no site
              </Link>
            </>
          )}
        </p>
        <ProfileForm
          initial={{
            name: author?.name ?? staff.name,
            bio: author?.bio ?? "",
            avatar_url: author?.avatar_url ?? staff.avatarUrl ?? "",
            // Coordenação também escreve como colunista
            columnist: staff.role !== "admin" || Boolean(author?.is_columnist),
            column_name: column?.name ?? "",
          }}
        />
      </section>
    </div>
  );
}
