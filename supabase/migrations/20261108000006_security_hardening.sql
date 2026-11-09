-- =====================================================================
-- Tribuna Socialista — reforço de segurança (revisão de 08/11/2026)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Papel só vale para e-mail CONFIRMADO.
--    Antes, o papel vinha do e-mail no token. Se o cadastro por e-mail e
--    senha estivesse aberto sem confirmação, alguém poderia criar conta
--    com o e-mail de um administrador. Agora o papel exige o e-mail
--    confirmado na tabela de usuários do Supabase.
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select a.role
  from auth.users u
  join public.allowed_emails a on a.email = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
$$;

-- ---------------------------------------------------------------------
-- 2. Colunista só assina com o próprio nome.
--    Antes, um colunista podia, pela API, pôr a assinatura de outra
--    pessoa (ex.: outro colunista ou "Redação") no próprio rascunho.
-- ---------------------------------------------------------------------
create or replace function public.articles_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role := public.current_user_role();
begin
  if auth.uid() is not null and r is null then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  if auth.uid() is not null and r = 'colunista' then
    if new.status <> 'draft' then
      raise exception 'Colunistas não podem publicar, agendar ou arquivar textos.' using errcode = '42501';
    end if;
    if new.featured or new.pinned then
      raise exception 'Colunistas não podem destacar textos na home.' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from old.created_by then
      raise exception 'Não é permitido transferir a autoria do texto.' using errcode = '42501';
    end if;
    if new.author_id is not null
       and (tg_op = 'INSERT' or new.author_id is distinct from old.author_id)
       and not exists (select 1 from public.authors a where a.id = new.author_id and a.profile_id = auth.uid()) then
      raise exception 'Colunistas só podem assinar com o próprio nome.' using errcode = '42501';
    end if;
    new.published_at := null;
    new.scheduled_at := null;
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'scheduled' then
    if new.scheduled_at is null then
      raise exception 'Informe a data e a hora do agendamento.' using errcode = '23514';
    end if;
    new.published_at := new.scheduled_at;
  end if;
  if new.status = 'draft' then
    new.scheduled_at := null;
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. Colunista edita só nome, biografia e foto da própria assinatura
--    (não muda tipo, endereço nem conta ligada).
-- ---------------------------------------------------------------------
create or replace function public.authors_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_editor() then
    if new.is_columnist is distinct from old.is_columnist
       or new.is_contributor is distinct from old.is_contributor
       or new.slug is distinct from old.slug
       or new.profile_id is distinct from old.profile_id then
      raise exception 'Só a edição pode alterar o tipo, o endereço ou a conta de um autor.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger authors_guard before update on public.authors
  for each row execute function public.authors_guard();

-- ---------------------------------------------------------------------
-- 4. Perfil: cada pessoa muda só nome e foto (não o e-mail exibido no
--    painel, que poderia confundir a tela de Usuários).
-- ---------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 5. Envios de leitores: o visitante não pode ligar o envio a um autor
--    ou a uma matéria (isso faria o texto dele sair com a assinatura e a
--    foto de outra pessoa). Esses vínculos são feitos só pela edição.
-- ---------------------------------------------------------------------
drop policy if exists "qualquer um envia texto" on public.submissions;
create policy "qualquer um envia texto" on public.submissions
  for insert to anon, authenticated
  with check (status = 'novo' and author_id is null and article_id is null);
