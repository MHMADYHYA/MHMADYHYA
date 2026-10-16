-- =============================================================================
-- التنبيهات: pg_cron كل 5 دقايق بينادي Edge Function اسمها notify-due عن طريق pg_net.
-- الرابط والسر بينقروا من Vault (بتضيفهم سامية مرة وحدة، انظر docs/NOTIFICATIONS_SETUP.md):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify-due', 'notify_due_url');
--   select vault.create_secret('<سر طويل عشوائي>', 'cron_secret');
-- كل إشي هون محمي بشروط عشان الملف يشتغل كمان على بيئة اختبار بدون هاي الإضافات.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end;
$$;

create or replace function public.invoke_notify_due()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  if to_regprocedure('net.http_post(text, jsonb, jsonb, jsonb, integer)') is null then
    return;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_due_url' limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function public.invoke_notify_due() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'notify-due') then
      perform cron.unschedule('notify-due');
    end if;
    perform cron.schedule('notify-due', '*/5 * * * *', 'select public.invoke_notify_due()');
  end if;
end;
$$;
