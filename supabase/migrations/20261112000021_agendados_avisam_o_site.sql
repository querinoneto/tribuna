-- =====================================================================
-- Tribuna Socialista — agendados avisam o site na hora em que entram no ar
--
-- Antes: o pg_cron mudava o texto agendado para "Publicado", mas o site
-- só percebia na renovação do cache (até 5 minutos, e só depois de uma
-- visita), e o card só ia ao Instagram quando alguém abria o Painel ou na
-- rotina diária das 9h30.
--
-- Agora: no mesmo minuto em que o pg_cron publica um agendado, o banco
-- chama /api/cron/agendados no site (extensão pg_net), que renova a capa
-- e as listas na hora e posta o card no Instagram.
--
-- Depois de rodar esta migração, guarde no Vault do Supabase (uma vez só,
-- em SQL Editor) o endereço do site e a mesma senha do CRON_SECRET da Vercel:
--
--   select vault.create_secret('https://tribunasocialista.com.br', 'tribuna_site_url');
--   select vault.create_secret('<o mesmo valor de CRON_SECRET>', 'tribuna_cron_secret');
--
-- Sem pg_net ou sem esses dois segredos, nada quebra: o agendamento segue
-- como antes (site em até 5 minutos; Instagram pelo Painel ou pela rotina
-- diária).
--
-- Pode ser rodada mais de uma vez sem problema.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  else
    raise notice 'pg_net indisponível: os agendados aparecem pelo cache (até 5 minutos).';
  end if;
end $$;

-- Chama o site (sem esperar a resposta). Nunca derruba quem a chamou.
create or replace function public.notify_site_scheduled_published()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  site text;
  secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    return;
  end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'tribuna_site_url' limit 1$q$ into site;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'tribuna_cron_secret' limit 1$q$ into secret;
  if coalesce(site, '') = '' or coalesce(secret, '') = '' then
    return;
  end if;
  execute $q$select net.http_get(url := $1, headers := $2, timeout_milliseconds := 10000)$q$
    using rtrim(site, '/') || '/api/cron/agendados',
          jsonb_build_object('Authorization', 'Bearer ' || secret);
exception when others then
  raise warning 'Aviso ao site falhou: %', sqlerrm;
end $$;

revoke all on function public.notify_site_scheduled_published() from public, anon, authenticated;

-- Mesma função de antes (rodada pelo pg_cron a cada minuto), agora avisando o site
create or replace function public.publish_due_articles()
returns integer language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  update public.articles
  set status = 'published'
  where status = 'scheduled' and scheduled_at <= now();
  get diagnostics n = row_count;
  if n > 0 then
    perform public.notify_site_scheduled_published();
  end if;
  return n;
end $$;

revoke all on function public.publish_due_articles() from public, anon, authenticated;
