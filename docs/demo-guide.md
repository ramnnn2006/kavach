# Kavach — Demo Guide

A 5-minute walkthrough of the society version. Passwords are in `docs/demo-accounts.md` (local only, git-ignored).

## Accounts (Alpha Residency, Chennai)

| Role | Login | What they show |
| --- | --- | --- |
| Resident | chloe@alpha.demo | Tower A, flat A-1204 · also a doctor (community first responder) |
| Resident | ben@alpha.demo | Tower C, flat C-0703 · wheelchair user (vulnerable → higher urgency) |
| Responder | sam@alpha.demo | Maintenance: lift, power, water · on duty |
| Responder | max@alpha.demo | Security: fire, medical, security · on duty |
| Admin | lily@alpha.demo | RWA secretary |
| Admin | jack@alpha.demo | Facility manager |

Tip: use three browser windows (or one normal + two private windows) so you can show resident, responder and admin at the same time.

## Script

1. **Lift SOS (resident → maintenance responder)**
   - Chloe: Home → **I'm stuck in a lift** → pick Lift A2 → Send alert. Tracker shows *Sent*.
   - Sam: the alert appears instantly with a sound; Max (security) does **not** see it.
   - Sam: **Claim** → **On my way** → **Reached** → **Mark resolved**. Chloe's tracker moves step by step, with times.
2. **Escalation**
   - Chloe reports a water problem and nobody claims it. After 2 minutes the server escalates it and the admins see it under *Needs attention*.
3. **Medical + community first responder**
   - Ben reports a medical emergency. His wheelchair flag raises urgency and is shown to responders.
   - Max (security) sees it; Chloe (doctor) sees it under *Medical alerts nearby* and taps **I'm coming**. Ben's tracker shows a neighbour is on the way.
4. **Two people claim at once**
   - Lily and Sam both press Claim on the same lift alert — exactly one wins, the other is told someone already took it (enforced in the database).
5. **Power cut**
   - Lily: Society → **Backup (DG)**. P1 zones (DG room, pump room, gate) stay on, towers (P2) stay on, parking rotates, clubhouse is cut. Residents see "Society is on backup power" on Home.
6. **Safety Check**
   - Lily: Safety Check → "Fire alarm in Tower B — evacuate by the stairs" → Start.
   - Residents get a prompt: **I'm safe** / **I need help**. "Need help" automatically becomes an incident. Lily sees live counts and who hasn't answered.
7. **Compliance**
   - Society → Compliance shows overdue items (DG fuel check, Lift A2 ARD battery test, Lift B1 licence). Sam marks one done from **Checks**.
8. **Command board**
   - Open `/board` on a laptop or TV: open alerts, who's on duty, equipment that's down, live clock.
9. **Tamil**
   - Profile → Language → தமிழ். Every screen switches.

## Resetting demo data

Incidents created during a demo stay in the database. To clear them (Supabase SQL editor or MCP):

```sql
delete from public.incidents;            -- also removes their audit events
update public.societies set power_source = 'grid';
update public.zones set power_state = 'on';
update public.safety_checks set ended_at = now() where ended_at is null;
```
