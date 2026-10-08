-- Kavach for Societies — resident home setup + Web Push subscriptions

-- ── set_my_home: resident picks tower / floor / flat number on first run ────
create or replace function public.set_my_home(p_zone_id uuid, p_floor int, p_flat_number text)
returns public.profiles
language plpgsql security definer
set search_path = public
as $$
declare
  me     public.profiles%rowtype;
  z      public.zones%rowtype;
  label  text;
  digits text := upper(regexp_replace(coalesce(p_flat_number, ''), '[^0-9A-Za-z]', '', 'g'));
  fl     public.flats%rowtype;
  fl_floor int;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.society_id is null then
    raise exception 'forbidden' using detail = 'Your account is not linked to a society';
  end if;
  if digits = '' or length(digits) > 8 then
    raise exception 'invalid' using detail = 'Enter a valid flat number';
  end if;

  select * into z from public.zones where id = p_zone_id and society_id = me.society_id and kind = 'tower';
  if not found then
    raise exception 'invalid' using detail = 'Choose a tower in your society';
  end if;

  label := coalesce(nullif(z.code, ''), left(z.name, 1)) || '-' || digits;
  -- Floor: explicit, else inferred from flat number (1204 → 12), else 0
  fl_floor := coalesce(
    p_floor,
    case when digits ~ '^[0-9]{3,4}$' then (left(digits, length(digits) - 2))::int else null end,
    0
  );
  if z.floors is not null then
    fl_floor := least(greatest(fl_floor, 0), z.floors);
  end if;

  select * into fl from public.flats where society_id = me.society_id and upper(number) = label;
  if not found then
    insert into public.flats (society_id, zone_id, number, floor)
    values (me.society_id, z.id, label, fl_floor)
    returning * into fl;
  elsif fl.zone_id <> z.id then
    raise exception 'invalid' using detail = 'That flat number belongs to another tower';
  end if;

  update public.profiles set flat_id = fl.id where id = me.id returning * into me;
  return me;
end;
$$;

revoke execute on function public.set_my_home(uuid, int, text) from public, anon;
grant execute on function public.set_my_home(uuid, int, text) to authenticated, service_role;

-- ── Web Push subscriptions (one row per device) ─────────────────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  society_id  uuid references public.societies(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
create index if not exists push_subscriptions_society_idx on public.push_subscriptions (society_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (profile_id = (select auth.uid()));

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  sid uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'forbidden';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'invalid' using detail = 'Bad push endpoint';
  end if;
  insert into public.push_subscriptions (profile_id, society_id, endpoint, p256dh, auth, user_agent)
  values (me.id, me.society_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, society_id = excluded.society_id,
        p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent
  returning id into sid;
  return sid;
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated, service_role;
