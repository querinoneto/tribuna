-- =====================================================================
-- Tribuna Socialista — o aviso dos agendados confere a senha no próprio
-- Supabase (Vault), sem precisar copiá-la para a Vercel
--
-- A senha do aviso (tribuna_cron_secret, no Vault) passa a ser conferida
-- pelo site perguntando ao banco, com a chave secreta do Supabase que a
-- Vercel já tem. Não importa mais se o CRON_SECRET da Vercel é igual.
-- O banco também espera até 30 segundos pela resposta (antes, 10), porque
-- a primeira chamada depois de uma publicação nova pode demorar.
--
-- Pode ser rodada mais de uma vez sem problema.
-- =====================================================================

-- Confere a senha recebida pelo site. Só o servidor (chave secreta) chama.
create or replace function public.site_notify_token_ok(p_token text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  secret text;
begin
  if coalesce(p_token, '') = '' or to_regclass('vault.decrypted_secrets') is null then
    return false;
  end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'tribuna_cron_secret' limit 1$q$ into secret;
  secret := btrim(coalesce(secret, ''));
  if secret = '' then
    return false;
  end if;
  -- compara os resumos (não revela a senha aos poucos pelo tempo de resposta)
  return extensions.digest(btrim(p_token), 'sha256') = extensions.digest(secret, 'sha256');
end $$;

revoke all on function public.site_notify_token_ok(text) from public, anon, authenticated;
grant execute on function public.site_notify_token_ok(text) to service_role;

-- Chama o site (sem esperar a resposta). Nunca derruba quem a chamou.
-- A senha vai no cabeçalho e também no endereço: se o domínio redirecionar
-- (por exemplo, para www), o cabeçalho pode se perder no caminho.
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
  site := btrim(coalesce(site, ''));
  secret := btrim(coalesce(secret, ''));
  if site = '' or secret = '' then
    return;
  end if;
  execute $q$select net.http_get(url := $1, params := $2, headers := $3, timeout_milliseconds := 30000)$q$
    using rtrim(site, '/') || '/api/cron/agendados',
          jsonb_build_object('t', secret),
          jsonb_build_object('Authorization', 'Bearer ' || secret);
exception when others then
  raise warning 'Aviso ao site falhou: %', sqlerrm;
end $$;

revoke all on function public.notify_site_scheduled_published() from public, anon, authenticated;
