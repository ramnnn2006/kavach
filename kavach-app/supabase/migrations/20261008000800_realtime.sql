-- Kavach for Societies — realtime publication (RLS still filters what each client receives)

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array[
    'incidents', 'incident_events', 'zones', 'assets', 'asset_checks', 'notices',
    'safety_checks', 'safety_check_responses', 'societies', 'profiles', 'power_events', 'contacts'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
