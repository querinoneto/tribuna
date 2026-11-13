-- =====================================================================
-- Tribuna Socialista — autores são só a equipe com acesso ativo
--
--   1. O administrador é autor como o colunista e o coordenador: ganha a
--      assinatura (e aparece em Colunistas) ao entrar, como os demais.
--   2. Só quem tem conta ativa no painel aparece em Colunistas e pode ser
--      escolhido como autor. Colaboradores (leitores que enviaram texto),
--      autores sem conta e quem perdeu o acesso saem da lista; a página
--      pessoal e os textos continuam no ar, com nome e foto.
--   3. A "Redação" deixa de ser autora. Textos que ela assinava ficam sem
--      autor até que alguém escolha um no editor.
--
-- Pode ser rodada mais de uma vez sem problema.
-- =====================================================================

-- 1. Assinatura para todos os papéis (antes: só colunista e coordenador),
--    e só para conta com e-mail CONFIRMADO (como o papel, migração 6): uma
--    conta não confirmada com o e-mail de alguém da equipe não vira autora.
create or replace function public.profile_email_confirmed(p_profile uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = p_profile and u.email_confirmed_at is not null)
$$;
revoke execute on function public.profile_email_confirmed(uuid) from public, anon, authenticated;

create or replace function public.profiles_columnist_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.profile_email_confirmed(new.id)
     and exists (select 1 from public.allowed_emails where email = lower(new.email) and role in ('colunista', 'editor', 'admin')) then
    perform public.ensure_staff_author(new.id, true);
  end if;
  return new;
end $$;

create or replace function public.allowed_emails_columnist_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  pid uuid;
begin
  if new.role in ('colunista', 'editor', 'admin') then
    for pid in select id from public.profiles where email = lower(new.email) loop
      if public.profile_email_confirmed(pid) then
        perform public.ensure_staff_author(pid, true);
      end if;
    end loop;
  end if;
  return new;
end $$;

-- Quem já tem acesso (inclusive administradores) e ainda não tinha assinatura
do $$
declare
  r record;
begin
  for r in
    select p.id from public.profiles p
    join public.allowed_emails e on e.email = lower(p.email)
    where public.profile_email_confirmed(p.id)
  loop
    perform public.ensure_staff_author(r.id, true);
  end loop;
end $$;

-- 2. Lista de Colunistas: só autores ligados a uma conta com acesso ativo
update public.authors a
   set is_columnist = false
 where a.is_columnist
   and (a.profile_id is null
        or a.revoked_at is not null
        or not exists (
          select 1 from public.profiles p
          join public.allowed_emails e on e.email = lower(p.email)
          where p.id = a.profile_id and public.profile_email_confirmed(p.id)));

-- 3. Sem a autora "Redação" (os textos ficam sem autor: on delete set null)
delete from public.authors where slug = 'redacao' and profile_id is null;
