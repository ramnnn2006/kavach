# Kavach for Societies — Product Spec (roles, features, data rules)

As of 2026-10-08. This is the contract every screen and the database follow.
Demo society: **Alpha Residency** (Towers A–D).

## Principles

- **No hardcoded data.** No demo reports, no fake names, no in-memory demo mode, no one-click fake logins. Everything comes from Supabase.
- **Real accounts only.** Demo users are real Supabase Auth accounts with passwords (see `docs/demo-accounts.md`, kept local, never committed).
- **Reporting app, not a shop.** Reporting is "What's happening?" → location → send, presented as an iOS grouped list with plain-language descriptions, not a product-tile grid.
- **Rules live in the database** (Postgres RLS + functions), never only in the UI.

## Roles

| Role | Who | Sees | Can do |
| --- | --- | --- | --- |
| `resident` | Flat owner / tenant | Own reports; society notices; society contacts | Report, cancel own pending report, add details |
| `responder` | Staff with **specialties** | Open reports whose type is in their specialties + anything assigned to them | Go on/off duty, claim, update status, resolve, add notes, update asset status in their specialty |
| `admin` | RWA committee / facility manager ("commander") | **Everything** in the society | Assign/reassign, change any status, post notices, manage team roles & specialties, set zone power, manage assets & contacts |

Responder specialties (incident types they handle):
- **Maintenance** → `lift`, `power`, `water`
- **Security** → `fire`, `medical`, `security`

## Demo accounts (2 per role)

| Role | Name | Specialty / detail |
| --- | --- | --- |
| resident | Priya Raman | Tower A, flat A-1204 |
| resident | Arjun Mehta | Tower C, flat C-0703 |
| responder | Suresh Kumar | Maintenance (lift, power, water) |
| responder | Ramesh Iyer | Security (fire, medical, security) |
| admin | Lakshmi Narayanan | RWA secretary |
| admin | Vikram Rao | Facility manager |

Emails `<firstname>@alpha.demo` with strong per-account passwords stored only in local `docs/demo-accounts.md`.

## Navigation (≤ 5 tabs each; sidebar on desktop)

### Resident
| Tab | Screen | New? |
| --- | --- | --- |
| Home | Big "Report an emergency" action, active report banner, quick lift SOS | — |
| Reports | My reports timeline with status | — |
| Notices | Society announcements from admins (power cuts, lift maintenance, drills) | **new** |
| Contacts | Society security desk, maintenance, managers, 112/101/108 | **new** |
| Profile | Name, phone, tower/flat, display settings, log out | — |

### Responder
| Tab | Screen | New? |
| --- | --- | --- |
| Alerts | On-duty switch; "Mine" then "Open" for my specialties, urgency-sorted; claim / next step | — |
| History | Reports I resolved, with time-to-resolve | **new** |
| Assets | Lifts / pumps / DG in my specialty with status (OK / Degraded / Down / Maintenance), update status | **new** |
| Profile | Specialty, duty status, settings | — |

### Admin
| Tab | Screen | New? |
| --- | --- | --- |
| Overview | Stats: Open, Unclaimed, In progress, Avg response; "Needs attention" (unclaimed > 2 min, escalated) | — |
| Incidents | All reports, filter by status/type/tower, assign/reassign to a responder, change status | **new** |
| Team | Responders with specialty, on-duty, active load; change role/specialty | **new** |
| Society | Zones with backup-power tier + power state (editable), assets, contacts | — |
| Notices | Post / delete announcements | **new** |

(Profile for admins sits in the sidebar footer / header avatar.)

## Reporting flow (resident)

1. Home → **Report an emergency** (primary, full width) or **I'm stuck in a lift** (one tap).
2. "What's happening?" — grouped list, one row per type with a one-line description:
   - Lift stuck — "Someone is trapped or the lift stopped between floors"
   - Fire or smoke
   - Medical emergency
   - Security — "Intruder, fight, suspicious activity"
   - Water — "No water, leak, overflow"
   - Power — "Outage, sparking, DG not starting"
3. Details — location prefilled from profile (tower, floor) with "Somewhere else" option; lift picker for lift reports; people affected; optional note.
4. Review & send → tracker.

## Data model (Supabase / Postgres)

Enums: `user_role (resident, responder, admin)`, `incident_type (lift, fire, medical, water, power, security)`, `incident_status (pending, acknowledged, en_route, on_scene, resolved, cancelled)`, `priority_tier (P1–P4)`, `power_state (on, rotating, off)`, `zone_kind`, `asset_kind (lift, dg, water_pump, fire_pump, sump, transformer)`, `asset_state (ok, degraded, down, maintenance)`, `event_action`.

Tables: `societies`, `zones` (towers and common areas, tier, power state), `flats`, `profiles` (role, specialties `incident_type[]`, on_duty, flat), `assets`, `hazard_weights`, `incidents`, `incident_events` (audit log), `notices`, `contacts`.

Key rules (RLS + RPCs):
- Resident: select own incidents; insert incident as self (server forces status/score/timestamps); cancel own pending.
- Responder: select incidents where `type = any(my specialties)` or `assigned_to = me`; claim only matching types; status forward-only, assignee only.
- Admin: select/update everything in society; assign/reassign; set any status.
- Everyone in society reads notices, contacts, zones, assets; only admins write them (responders may update asset status in their specialty).
- Audit log written by triggers only.
- `pg_cron` every 30 s: urgency age factor + escalation level.

## Client data contract (`src/data/db.js`)

```
auth:      signIn(email, password) · signUp({ email, password, fullName, phone }) · signOut() · resetPassword(email)
profile:   getMyProfile() · updateMyProfile(fields) · setOnDuty(bool)
incidents: createIncident({ type, zoneId, floor, assetId?, locationNote?, description?, peopleAffected })
           listenIncident(id, cb) · listenMyIncidents(cb) · listenQueue(cb)           // RLS decides scope
           claimIncident(id) · advanceIncident(id, nextStatus, note?) · cancelIncident(id)
           assignIncident(id, responderId)                                            // admin
           listIncidentEvents(id)
team:      listResponders()  · updateMember(id, { role?, specialties? })              // admin
society:   listZones() · setZonePower(zoneId, state) · listAssets() · setAssetStatus(id, state)
notices:   listNotices() · postNotice({ title, body, pinned? }) · deleteNotice(id)
contacts:  listContacts()
```
Errors are thrown as `Error` with `code`: `already_claimed`, `forbidden`, `not_found`, `offline`, `invalid`.

## Build order

1. Database: migrations + RLS + RPCs + cron + seed (society, zones, assets, contacts, 6 accounts; **no incidents**).
2. `src/lib/supabase.js`, `src/data/db.js`, AuthContext on Supabase; delete Firebase and demo mode.
3. In parallel, one agent per role builds its screens against `db.js`:
   - Resident (Home, Report flow, Tracker, Reports, Notices, Contacts)
   - Responder (Alerts, History, Assets)
   - Admin (Overview, Incidents, Team, Society, Notices)
4. Shared: routes, nav configs, Profile, Login (no demo buttons).

## Selected features (2026-10-08)

Safety
- **Safety Check roll call** — admin starts a check for a tower / whole society ("Fire in Tower B — evacuate"). Every resident in scope answers *I'm safe* / *I need help*; admin sees live counts and who hasn't answered; residents needing help become incidents automatically.
- **Vulnerable residents** — opt-in profile flags (elderly, mobility, oxygen/medical device, infant, other note). Visible to responders/admin on that resident's incidents and in Safety Check lists; adds to urgency score.
- **Community first responders** — residents opt in with a skill (doctor, nurse, first aid). Medical incidents in the society notify them; they can mark "I'm coming" (does not claim the incident).

Operations
- **Backup & compliance tracker** — scheduled checks per asset (DG fuel, lift ARD battery test, fire extinguisher expiry, lift licence / AMC renewal) with due dates; overdue items on the admin dashboard; responders log checks.
- **Power-cut mode** — admin toggles society power source (grid / DG). In DG mode, zone power states follow P1–P4 tiers; residents see what is powered; every switch is logged.
- **Command board** — full-screen live view (`/board`) for the security cabin: open alerts, on-duty team, lift/DG status, active Safety Check.
- **Reliability reports** — incidents per asset/zone/type per month, average claim and resolve times, top repeat assets; printable post-incident report built from the audit log.

Language
- **English + Tamil** for all user-facing strings (i18n dictionary, toggle in Profile).

Updated navigation
- Resident: Home · Reports · Notices · Contacts · Profile (Safety Check prompt appears on Home when active)
- Responder: Alerts · Checks · Assets · History · Profile
- Admin: Overview · Incidents · Team · Society (zones, power mode, assets, compliance) · Reports — plus Notices, Safety Check and Command board from Overview
