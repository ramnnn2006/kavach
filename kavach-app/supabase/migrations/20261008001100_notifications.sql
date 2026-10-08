-- Kavach for Societies — Web Push dispatch
--
-- Flow: incidents / safety_checks trigger → pg_net POST (after commit) → `notify` edge function
--       → loads the row fresh, picks recipients, sends Web Push (VAPID, RFC 8291/8292).
--
-- Secrets live ONLY in Supabase Vault — never in this repo. Create them once per project:
--   select vault.create_secret('<base64url public key>',  'vapid_public_key');
--   select vault.create_secret('<base64url private key>', 'vapid_private_key');
--   select vault.create_secret('mailto:alerts@kavach.app', 'vapid_subject');
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'notify_hook_secret');
-- (keys from `npx web-push generate-vapid-keys --json`; the public key also goes in VITE_VAPID_PUBLIC_KEY)
-- Until they exist the trigger is a no-op, so inserts never depend on push being configured.

-- pg_net keeps its functions in schema `net`; the extension itself is registered in `extensions`
-- (not `public`, which the security advisor flags).
create extension if not exists pg_net with schema extensions;

-- ── Push config for the edge function (service_role only) ─────────────────
create or replace function public.get_push_config()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'public_key',  (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'   limit 1),
    'private_key', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key'  limit 1),
    'subject',     (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_subject'      limit 1),
    'hook_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_hook_secret' limit 1)
  );
$$;

revoke execute on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;

-- ── Trigger: hand the change to the `notify` edge function ────────────────
-- The payload only says WHAT changed; the function re-reads the row and decides who gets what.
-- Never raises: a push problem must never block an SOS insert or a status change.
create or replace function public.notify_dispatch()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  secret  text;
  payload jsonb;
begin
  begin
    select decrypted_secret into secret
      from vault.decrypted_secrets
     where name = 'notify_hook_secret'
     limit 1;
    if secret is null or secret = '' then
      return null;  -- push not configured on this project
    end if;

    if tg_table_name = 'incidents' and tg_op = 'INSERT' then
      payload := jsonb_build_object(
        'table', tg_table_name, 'op', tg_op, 'id', new.id,
        'status', new.status, 'old_status', null,
        'escalation_level', new.escalation_level, 'old_escalation_level', null,
        'assigned_to', new.assigned_to, 'old_assigned_to', null,
        'actor_id', auth.uid()
      );
    elsif tg_table_name = 'incidents' and tg_op = 'UPDATE' then
      payload := jsonb_build_object(
        'table', tg_table_name, 'op', tg_op, 'id', new.id,
        'status', new.status, 'old_status', old.status,
        'escalation_level', new.escalation_level, 'old_escalation_level', old.escalation_level,
        'assigned_to', new.assigned_to, 'old_assigned_to', old.assigned_to,
        'actor_id', auth.uid()
      );
    else
      payload := jsonb_build_object('table', tg_table_name, 'op', tg_op, 'id', new.id, 'actor_id', auth.uid());
    end if;

    perform net.http_post(
      url := 'https://sbjigxnuqgfqriaaomkm.supabase.co/functions/v1/notify',
      body := payload,
      params := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-kavach-hook', secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'notify_dispatch(%.%): %', tg_table_name, tg_op, sqlerrm;
  end;
  return null;
end;
$$;

revoke execute on function public.notify_dispatch() from public, anon, authenticated;

drop trigger if exists incidents_notify_insert on public.incidents;
create trigger incidents_notify_insert
  after insert on public.incidents
  for each row execute function public.notify_dispatch();

-- urgency_score is rewritten every 30 s by the cron tick; only real changes reach the function
drop trigger if exists incidents_notify_update on public.incidents;
create trigger incidents_notify_update
  after update on public.incidents
  for each row
  when (
       old.status is distinct from new.status
    or old.assigned_to is distinct from new.assigned_to
    or old.escalation_level is distinct from new.escalation_level
  )
  execute function public.notify_dispatch();

drop trigger if exists safety_checks_notify_insert on public.safety_checks;
create trigger safety_checks_notify_insert
  after insert on public.safety_checks
  for each row execute function public.notify_dispatch();
