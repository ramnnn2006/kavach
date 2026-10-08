-- Kavach for Societies — trigger functions and triggers

create or replace function public.safe_uuid(p text)
returns uuid
language plpgsql immutable
set search_path = public
as $$
begin
  return nullif(p, '')::uuid;
exception when others then
  return null;
end;
$$;

-- ── New auth user → profile (role always resident; society from metadata or the only society)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  sid  uuid := public.safe_uuid(meta->>'society_id');
  fid  uuid := public.safe_uuid(meta->>'flat_id');
  lang public.language_code := 'en';
begin
  if sid is null and (select count(*) from public.societies) = 1 then
    select id into sid from public.societies limit 1;
  end if;

  if fid is null and sid is not null and nullif(meta->>'flat_number', '') is not null then
    select id into fid from public.flats
     where society_id = sid and upper(number) = upper(trim(meta->>'flat_number'))
     limit 1;
  end if;

  if (meta->>'language') in ('en', 'ta') then
    lang := (meta->>'language')::public.language_code;
  end if;

  insert into public.profiles (id, society_id, full_name, email, phone, flat_id, language)
  values (
    new.id,
    sid,
    coalesce(nullif(trim(meta->>'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    nullif(trim(meta->>'phone'), ''),
    fid,
    lang
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Profiles: validate + protect immutable columns
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.flat_id is not null and new.flat_id is distinct from old.flat_id then
    perform 1 from public.flats where id = new.flat_id and society_id = new.society_id;
    if not found then
      raise exception 'invalid' using detail = 'Flat does not belong to your society';
    end if;
  end if;

  if new.role = 'resident' then
    new.specialties := '{}';
    new.on_duty := false;
  end if;

  if jsonb_typeof(new.vulnerability) <> 'object' then
    new.vulnerability := '{}'::jsonb;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ── Incidents: server owns status, score, snapshots and timestamps
create or replace function public.incidents_before_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  prof public.profiles%rowtype;
  z    public.zones%rowtype;
  f    public.flats%rowtype;
  a    public.assets%rowtype;
  hw   int;
begin
  new.reporter_id := coalesce(auth.uid(), new.reporter_id);
  if new.reporter_id is null then
    raise exception 'forbidden' using detail = 'No reporter';
  end if;

  select * into prof from public.profiles where id = new.reporter_id;
  if not found or prof.society_id is null then
    raise exception 'forbidden' using detail = 'Reporter is not a member of a society';
  end if;

  -- server-owned fields
  new.id               := coalesce(new.id, gen_random_uuid());
  new.society_id       := prof.society_id;
  new.status           := 'pending';
  new.assigned_to      := null;
  new.assigned_name    := null;
  new.assigned_phone   := null;
  new.assigned_at      := null;
  new.acknowledged_at  := null;
  new.en_route_at      := null;
  new.on_scene_at      := null;
  new.resolved_at      := null;
  new.cancelled_at     := null;
  new.resolution_note  := null;
  new.escalation_level := 1;
  new.created_at       := now();
  new.updated_at       := now();
  if new.source = 'safety_check' and new.safety_check_id is null then
    new.source := 'app';
  end if;

  -- reporter snapshot
  new.reporter_name          := prof.full_name;
  new.reporter_phone         := prof.phone;
  new.reporter_vulnerability := prof.vulnerability;
  new.vulnerable             := public.has_vulnerability(prof.vulnerability);

  -- location: flat → zone/floor defaults
  if new.flat_id is null then
    new.flat_id := prof.flat_id;
  end if;
  if new.flat_id is not null then
    select * into f from public.flats where id = new.flat_id;
    if not found or f.society_id <> new.society_id then
      raise exception 'invalid' using detail = 'Flat not in society';
    end if;
    new.flat_label := f.number;
    new.zone_id := coalesce(new.zone_id, f.zone_id);
    new.floor   := coalesce(new.floor, f.floor);
  end if;

  if new.zone_id is null then
    raise exception 'invalid' using detail = 'Location (zone) is required';
  end if;
  select * into z from public.zones where id = new.zone_id;
  if not found or z.society_id <> new.society_id then
    raise exception 'invalid' using detail = 'Zone not in society';
  end if;
  new.zone_name := z.name;
  new.zone_tier := z.tier;

  if new.asset_id is not null then
    select * into a from public.assets where id = new.asset_id;
    if not found or a.society_id <> new.society_id then
      raise exception 'invalid' using detail = 'Asset not in society';
    end if;
    new.asset_name := a.name;
  end if;

  -- scoring
  select weight into hw from public.hazard_weights where society_id = new.society_id and type = new.type;
  new.hazard_weight   := coalesce(hw, public.default_hazard_weight(new.type));
  new.people_affected := least(500, greatest(1, coalesce(new.people_affected, 1)));
  new.urgency_score   := public.compute_urgency(new.hazard_weight, new.zone_tier, new.people_affected, 0, new.vulnerable);

  new.description   := nullif(trim(coalesce(new.description, '')), '');
  new.location_note := nullif(trim(coalesce(new.location_note, '')), '');
  return new;
end;
$$;

create or replace function public.incidents_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- immutable
  new.id              := old.id;
  new.society_id      := old.society_id;
  new.reporter_id     := old.reporter_id;
  new.type            := old.type;
  new.client_id       := old.client_id;
  new.source          := old.source;
  new.safety_check_id := old.safety_check_id;
  new.created_at      := old.created_at;
  new.updated_at      := now();

  if new.status <> old.status then
    if not public.is_active_status(old.status) then
      raise exception 'invalid' using detail = 'Incident is already closed';
    end if;
    if public.status_rank(new.status) <= public.status_rank(old.status) then
      raise exception 'invalid' using detail = 'Status can only move forward';
    end if;
    case new.status
      when 'acknowledged' then new.acknowledged_at := coalesce(new.acknowledged_at, now());
      when 'en_route'     then new.en_route_at     := coalesce(new.en_route_at, now());
      when 'on_scene'     then new.on_scene_at     := coalesce(new.on_scene_at, now());
      when 'resolved'     then new.resolved_at     := coalesce(new.resolved_at, now());
      when 'cancelled'    then new.cancelled_at    := coalesce(new.cancelled_at, now());
      else null;
    end case;
    -- a closed incident stops escalating
    if not public.is_active_status(new.status) then
      new.escalation_level := old.escalation_level;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.incident_actor_name(p_actor uuid)
returns text
language sql stable security definer
set search_path = public
as $$ select full_name from public.profiles where id = p_actor $$;

create or replace function public.incidents_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, to_status, data)
  values (
    new.id, new.society_id, new.reporter_id, new.reporter_name, 'created', new.status,
    jsonb_build_object('type', new.type, 'zone', new.zone_name, 'flat', new.flat_label,
                       'people', new.people_affected, 'urgency', new.urgency_score, 'source', new.source)
  );
  return new;
end;
$$;

create or replace function public.incidents_after_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  aname text := public.incident_actor_name(auth.uid());
  act   public.event_action;
begin
  if new.status <> old.status then
    act := case
      when new.status = 'resolved'  then 'resolved'::public.event_action
      when new.status = 'cancelled' then 'cancelled'::public.event_action
      when old.status = 'pending' and new.assigned_to is not null and new.assigned_to = actor then 'claimed'::public.event_action
      when old.status = 'pending' and new.assigned_to is not null then 'assigned'::public.event_action
      else 'status_changed'::public.event_action
    end;
    insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, from_status, to_status, note, data)
    values (new.id, new.society_id, actor, aname, act, old.status, new.status,
            case when new.status in ('resolved', 'cancelled') then new.resolution_note else null end,
            jsonb_build_object('assigned_to', new.assigned_to, 'assigned_name', new.assigned_name));
  elsif new.assigned_to is distinct from old.assigned_to then
    insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, data)
    values (new.id, new.society_id, actor, aname,
            case when old.assigned_to is null then 'assigned'::public.event_action else 'reassigned'::public.event_action end,
            jsonb_build_object('from', old.assigned_name, 'to', new.assigned_name, 'assigned_to', new.assigned_to));
  end if;

  if new.escalation_level > old.escalation_level then
    insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, data)
    values (new.id, new.society_id, null, 'System', 'escalated',
            jsonb_build_object('level', new.escalation_level, 'urgency', new.urgency_score));
  end if;

  if new.status = old.status and (
       new.description is distinct from old.description
    or new.location_note is distinct from old.location_note
    or new.people_affected <> old.people_affected
    or new.asset_id is distinct from old.asset_id
  ) then
    insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, data)
    values (new.id, new.society_id, actor, aname, 'details_updated',
            jsonb_build_object('people', new.people_affected, 'asset', new.asset_name));
  end if;

  return new;
end;
$$;

drop trigger if exists incidents_before_insert on public.incidents;
create trigger incidents_before_insert
  before insert on public.incidents
  for each row execute function public.incidents_before_insert();

drop trigger if exists incidents_before_update on public.incidents;
create trigger incidents_before_update
  before update on public.incidents
  for each row execute function public.incidents_before_update();

drop trigger if exists incidents_after_insert on public.incidents;
create trigger incidents_after_insert
  after insert on public.incidents
  for each row execute function public.incidents_after_insert();

drop trigger if exists incidents_after_update on public.incidents;
create trigger incidents_after_update
  after update on public.incidents
  for each row execute function public.incidents_after_update();

-- ── Assets: track who changed the state
create or replace function public.assets_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id := old.id;
  new.society_id := old.society_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.state <> old.state then
    new.state_changed_at := now();
    new.state_changed_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists assets_before_update on public.assets;
create trigger assets_before_update
  before update on public.assets
  for each row execute function public.assets_before_update();

-- ── Safety Check: "I need help" becomes an incident automatically
create or replace function public.safety_check_responses_before_write()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  chk  public.safety_checks%rowtype;
  prof public.profiles%rowtype;
  zid  uuid;
begin
  select * into chk from public.safety_checks where id = new.check_id;
  if not found then
    raise exception 'not_found' using detail = 'Safety check not found';
  end if;
  new.society_id   := chk.society_id;
  new.responded_at := now();
  new.note := nullif(trim(coalesce(new.note, '')), '');

  if new.status = 'need_help' and new.incident_id is null then
    select * into prof from public.profiles where id = new.profile_id;
    zid := chk.zone_id;
    if zid is null and prof.flat_id is not null then
      select zone_id into zid from public.flats where id = prof.flat_id;
    end if;
    if zid is null then
      select id into zid from public.zones where society_id = chk.society_id order by sort_order, name limit 1;
    end if;

    insert into public.incidents
      (society_id, source, type, reporter_id, zone_id, flat_id, description, people_affected, safety_check_id)
    values
      (chk.society_id, 'safety_check', chk.incident_type, new.profile_id, zid, prof.flat_id,
       'Safety Check — needs help: ' || chk.message || coalesce(' · ' || new.note, ''), 1, chk.id)
    returning id into new.incident_id;
  end if;

  return new;
end;
$$;

drop trigger if exists safety_check_responses_before_write on public.safety_check_responses;
create trigger safety_check_responses_before_write
  before insert or update on public.safety_check_responses
  for each row execute function public.safety_check_responses_before_write();

-- ── updated_at bumps
drop trigger if exists societies_touch on public.societies;
create trigger societies_touch before update on public.societies
  for each row execute function public.touch_updated_at();

drop trigger if exists zones_touch on public.zones;
create trigger zones_touch before update on public.zones
  for each row execute function public.touch_updated_at();

drop trigger if exists asset_checks_touch on public.asset_checks;
create trigger asset_checks_touch before update on public.asset_checks
  for each row execute function public.touch_updated_at();

drop trigger if exists notices_touch on public.notices;
create trigger notices_touch before update on public.notices
  for each row execute function public.touch_updated_at();
