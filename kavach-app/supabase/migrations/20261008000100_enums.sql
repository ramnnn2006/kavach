-- Kavach for Societies — enums
-- Order: enums → tables → functions → triggers → rls → rpcs → cron → realtime

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('resident', 'responder', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'incident_type') then
    create type public.incident_type as enum ('lift', 'fire', 'medical', 'water', 'power', 'security');
  end if;
  if not exists (select 1 from pg_type where typname = 'incident_status') then
    create type public.incident_status as enum ('pending', 'acknowledged', 'en_route', 'on_scene', 'resolved', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'priority_tier') then
    create type public.priority_tier as enum ('P1', 'P2', 'P3', 'P4');
  end if;
  if not exists (select 1 from pg_type where typname = 'power_state') then
    create type public.power_state as enum ('on', 'rotating', 'off');
  end if;
  if not exists (select 1 from pg_type where typname = 'power_source') then
    create type public.power_source as enum ('grid', 'dg');
  end if;
  if not exists (select 1 from pg_type where typname = 'zone_kind') then
    create type public.zone_kind as enum ('tower', 'clubhouse', 'parking', 'utility', 'gate', 'common');
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_kind') then
    create type public.asset_kind as enum ('lift', 'dg', 'water_pump', 'fire_pump', 'sump', 'transformer');
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_state') then
    create type public.asset_state as enum ('ok', 'degraded', 'down', 'maintenance');
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_check_kind') then
    create type public.asset_check_kind as enum (
      'dg_fuel', 'dg_load_test', 'lift_ard_battery', 'lift_licence', 'lift_amc',
      'fire_extinguisher_expiry', 'fire_pump_test', 'pump_service', 'transformer_service', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'event_action') then
    create type public.event_action as enum (
      'created', 'claimed', 'status_changed', 'assigned', 'reassigned', 'escalated',
      'cancelled', 'resolved', 'note_added', 'details_updated', 'first_responder_ack'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'safety_check_scope') then
    create type public.safety_check_scope as enum ('society', 'zone');
  end if;
  if not exists (select 1 from pg_type where typname = 'safety_response_status') then
    create type public.safety_response_status as enum ('safe', 'need_help');
  end if;
  if not exists (select 1 from pg_type where typname = 'language_code') then
    create type public.language_code as enum ('en', 'ta');
  end if;
  if not exists (select 1 from pg_type where typname = 'first_responder_skill') then
    create type public.first_responder_skill as enum ('doctor', 'nurse', 'paramedic', 'first_aid');
  end if;
  if not exists (select 1 from pg_type where typname = 'contact_kind') then
    create type public.contact_kind as enum ('society', 'emergency');
  end if;
  if not exists (select 1 from pg_type where typname = 'incident_source') then
    create type public.incident_source as enum ('app', 'safety_check', 'qr', 'admin');
  end if;
end $$;
