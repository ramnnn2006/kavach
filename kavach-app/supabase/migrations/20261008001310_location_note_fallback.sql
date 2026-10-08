-- A report with only a spot note still gets delivered: it goes to the reporter's tower
-- (zone only, no flat) instead of failing with "Location (zone) is required".

create or replace function public.incidents_before_insert()
returns trigger
language plpgsql
security definer
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

  new.reporter_name          := prof.full_name;
  new.reporter_phone         := prof.phone;
  new.reporter_vulnerability := prof.vulnerability;
  new.vulnerable             := public.has_vulnerability(prof.vulnerability);

  new.description   := nullif(trim(coalesce(new.description, '')), '');
  new.location_note := nullif(trim(coalesce(new.location_note, '')), '');

  -- No location given at all: assume the reporter's own flat.
  -- Only a spot note (e.g. the list of places failed to load): route to the reporter's tower,
  -- without their flat, so the alert still reaches someone and the note says where.
  if new.flat_id is null and new.zone_id is null then
    if new.location_note is null then
      new.flat_id := prof.flat_id;
    else
      select zone_id into new.zone_id from public.flats where id = prof.flat_id;
    end if;
  end if;
  if new.flat_id is not null then
    select * into f from public.flats where id = new.flat_id;
    if not found or f.society_id <> new.society_id then
      raise exception 'invalid' using detail = 'Flat not in society';
    end if;
    if new.zone_id is not null and new.zone_id <> f.zone_id then
      -- Zone wins (e.g. a tower-wide Safety Check); the flat is elsewhere.
      new.flat_id := null;
    else
      new.flat_label := f.number;
      new.zone_id := f.zone_id;
      new.floor   := coalesce(new.floor, f.floor);
    end if;
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

  select weight into hw from public.hazard_weights where society_id = new.society_id and type = new.type;
  new.hazard_weight   := coalesce(hw, public.default_hazard_weight(new.type));
  new.people_affected := least(500, greatest(1, coalesce(new.people_affected, 1)));
  new.urgency_score   := public.compute_urgency(new.hazard_weight, new.zone_tier, new.people_affected, 0, new.vulnerable);
  return new;
end;
$$;
revoke execute on function public.incidents_before_insert() from public, anon, authenticated;
