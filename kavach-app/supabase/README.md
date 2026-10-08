# Kavach — Supabase schema

Postgres schema for Kavach for Societies. Apply `migrations/*.sql` in filename order, then `seed.sql`,
then (locally) `seed_users.local.sql`. Demo credentials live in `docs/demo-accounts.md` (git-ignored).

```
supabase link --project-ref <ref>     # once
supabase db push                      # applies migrations/
psql "$DB_URL" -f supabase/seed.sql   # or paste into the SQL editor
psql "$DB_URL" -f supabase/seed_users.local.sql
```

## Files

| File | Contents |
| --- | --- |
| `20261008000100_enums.sql` | `user_role`, `incident_type`, `incident_status`, `priority_tier`, `power_state`, `power_source`, `zone_kind`, `asset_kind`, `asset_state`, `asset_check_kind`, `event_action`, `safety_check_scope`, `safety_response_status`, `language_code`, `first_responder_skill`, `contact_kind`, `incident_source` |
| `…0200_tables.sql` | Tables + indexes (below) |
| `…0300_functions.sql` | `auth_role()`, `auth_society()`, `auth_specialties()`, `is_admin()`, `is_responder()`, `is_staff()`, `compute_urgency()`, `escalation_for()`, `status_rank()`, `default_hazard_weight()`, `asset_kind_type()` |
| `…0400_triggers.sql` | auth user → profile; incident insert/update guards + snapshots + audit log; asset state tracking; Safety Check "need help" → incident |
| `…0500_rls.sql` | Grants (column-level) + RLS policies |
| `…0600_rpcs.sql` | All state-changing RPCs, reports, `v_compliance`, `v_team` |
| `…0700_cron.sql` | `tick_incidents()` every 30 s via `pg_cron` |
| `…0800_realtime.sql` | Adds tables to `supabase_realtime` |
| `…0900_home_and_push.sql` | `set_my_home()` (resident picks tower/flat on first run), `push_subscriptions` + `save_push_subscription()` |
| `…1000_rls_tuning.sql` | Advisor fixes: one policy per table/action, `(select auth.uid())` initplans, FK indexes, trigger functions not callable via RPC |

## Testing

`node scripts/smoke-test.mjs` signs in as the six demo accounts and runs 28 permission checks against the live project
(anon blocked, specialty visibility, concurrent claim → exactly one winner, forward-only status, audit log, first responders,
admin-only RPCs, asset permissions). It tags its incidents `[smoke-test]`; delete them afterwards:
`delete from incidents where description like '[smoke-test]%';`

## Tables

| Table | Purpose |
| --- | --- |
| `societies` | One row per society: power source (grid/dg), escalation thresholds |
| `zones` | Towers, clubhouse, parking, utility rooms, gate; backup-power tier P1–P4 and live `power_state` |
| `flats` | Flat numbers per tower |
| `profiles` | 1:1 with `auth.users`: role, responder specialties, on-duty, flat, language, vulnerability flags, first-responder skill |
| `hazard_weights` | Per-society override of type weights |
| `assets` | Lifts, DG, pumps, transformer, sump with live state |
| `asset_checks` | Scheduled compliance checks (fuel, ARD battery, licence, AMC, extinguishers…) with due dates |
| `incidents` | Reports. Server-owned: status, score, escalation, snapshots of reporter/zone/flat/asset/assignee |
| `incident_events` | Append-only audit log written by triggers and RPCs |
| `notices` | Society announcements |
| `contacts` | Society desk numbers + 112/101/108 |
| `safety_checks` / `safety_check_responses` | Roll call; "need help" auto-creates an incident |
| `first_responder_acks` | Community first responders saying "I'm coming" |
| `power_events` | Log of grid ↔ DG switches |

## Urgency and escalation

`urgency = 0.35·hazard + 0.25·tier + 0.25·min(100, people×20) + 0.15·min(100, minutes×10) + 10 if reporter is vulnerable`, capped at 100.
Computed at insert, on details change, and every 30 s by `tick_incidents()`. Unclaimed incidents go to
escalation level 2 after `societies.escalate_l2_after` (default 2 min) and level 3 after `escalate_l3_after` (5 min). Levels never go down; each rise is logged as an `escalated` event.

## RLS matrix (`anon` has no access to anything)

| Table | resident | responder | admin |
| --- | --- | --- | --- |
| societies, zones, flats, assets, asset_checks, contacts, notices, power_events, safety_checks | read society | read society | read + write society (power/asset state via RPC) |
| profiles | own row (edit name, phone, flat, language, vulnerability, first-responder skill) | read society, edit own | read society, edit own + members' details (role/specialties via RPC) |
| incidents | own reports (insert; everything else via RPC); medical incidents if first responder | own specialties + assigned to me | all in society |
| incident_events, first_responder_acks | visible when the incident is visible (write via triggers/RPC) | same | same |
| safety_check_responses | own | society | society |

Clients cannot update `profiles.role / specialties / on_duty / society_id`, `incidents.*`, `zones.power_state`, `assets.state`, or any log table directly.

## RPCs (all raise `already_claimed` · `forbidden` · `not_found` · `invalid`)

| RPC | Who | What |
| --- | --- | --- |
| `claim_incident(id)` | responder (matching specialty) / admin | `SELECT … FOR UPDATE`; pending → acknowledged, assigns caller |
| `advance_incident(id, next, note?)` | assignee / admin | forward-only; admin takes unassigned incidents; note → event |
| `cancel_incident(id, reason?)` | reporter (pending/acknowledged) / admin | → cancelled |
| `assign_incident(id, responder_id)` | admin | assign or reassign; pending → acknowledged |
| `update_incident_details(id, description?, note?, people?, asset?)` | reporter / admin | while active; recomputes urgency |
| `first_responder_ack(id)` | profile with a first-responder skill | "I'm coming" on active medical incidents |
| `set_on_duty(bool)` | responder / admin | own duty flag |
| `update_member(profile_id, role, specialties?)` | admin | change role/specialties; can't demote self |
| `set_zone_power(zone_id, state)` | admin | manual zone power |
| `set_power_source('grid'|'dg', note?)` | admin | DG mode applies tiers (P1/P2 on, P3 rotating, P4 off); logs `power_events` |
| `set_asset_status(asset_id, state, note?)` | admin / responder covering the asset kind | lift→lift, dg/transformer→power, pumps/sump→water, fire pump→fire |
| `log_asset_check(check_id, notes?)` | admin / responder covering the check | marks done, rolls `due_at` forward |
| `start_safety_check(scope, zone_id?, message, type?)` / `end_safety_check(id)` | admin | roll call |
| `respond_safety_check(check_id, 'safe'|'need_help', note?)` | members in scope | upsert; `need_help` creates an incident |
| `report_summary(from, to)`, `report_by_asset`, `report_by_zone`, `report_monthly(months)` | admin | reliability reports |
| `incident_report(id)` | anyone who can see the incident | JSON for the printable post-incident report |
| `safety_check_summary(check_id)` | staff | in-scope / safe / need-help / unanswered counts |

Views: `v_compliance` (checks with `overdue` / `due_soon` / `ok`), `v_team` (responders with active load).

## Realtime

`incidents`, `incident_events`, `zones`, `assets`, `asset_checks`, `notices`, `safety_checks`,
`safety_check_responses`, `societies`, `profiles`, `power_events`, `contacts` are in `supabase_realtime`;
RLS filters what each client receives.
