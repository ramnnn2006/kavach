-- Kavach for Societies — scheduled urgency / escalation tick (pg_cron, every 30 s)

create extension if not exists pg_cron;

-- Recompute the waiting-time part of the urgency score and raise the escalation level
-- for unclaimed incidents. Escalation never goes down (history is kept on the row).
create or replace function public.tick_incidents()
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  n int;
begin
  with calc as (
    select i.id,
           public.compute_urgency(
             i.hazard_weight, i.zone_tier, i.people_affected,
             extract(epoch from (now() - i.created_at)) / 60.0, i.vulnerable
           ) as score,
           greatest(i.escalation_level,
                    public.escalation_for(i.created_at, i.status, s.escalate_l2_after, s.escalate_l3_after)) as lvl
      from public.incidents i
      join public.societies s on s.id = i.society_id
     where public.is_active_status(i.status)
  )
  update public.incidents i
     set urgency_score = c.score,
         escalation_level = c.lvl
    from calc c
   where c.id = i.id
     and (i.urgency_score <> c.score or i.escalation_level <> c.lvl);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.tick_incidents() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'kavach_tick_incidents';
  perform cron.schedule('kavach_tick_incidents', '30 seconds', 'select public.tick_incidents()');
end $$;
