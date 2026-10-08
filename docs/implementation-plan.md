# Kavach for Societies — Implementation Plan

As of 2026-10-08. Builds on `audit-and-fix-plan.md` (what's broken) and `rebrand-plan.md` (what we're building).

## Decisions (recommended defaults — change any before we start)

| Decision | Choice |
| --- | --- |
| Styles | New small design system (tokens + ~15 components), not the old deleted CSS |
| Database | Hosted Supabase (Postgres + Auth + Realtime + RLS + pg_cron) |
| Demo mode | Seeded demo accounts inside Supabase only; no in-memory mock |
| Icons | lucide-react only; Material Symbols font removed |
| Hosting | Vercel only; Firebase removed completely |
| Git | Commit today's bug fixes first, then one branch per phase |

## What I need from you (and when)

1. **Before Phase 2:** create a Supabase project at supabase.com (free tier, region Mumbai `ap-south-1`). Send me:
   - Project URL and **anon** key → I put them in local `kavach-app/.env` (git-ignored)
   - Database password → only for running migrations from your machine with the Supabase CLI
   - Never paste the `service_role` key anywhere in the app
2. **Before Phase 3:** a society name for the demo seed (or I invent one, e.g. "Green Meadows, Chennai").
3. **End of each phase:** a quick click-through on your phone and laptop.

## Phase 0 — Save current work (15 min)

- Commit today's fixes on `main` (rules, signup role, claim uid, tracker listener, urgency formula, demo listeners, puppeteer removal, lint).
- Commit `docs/` (evidence, rebrand plan, audit plan, this plan).
- Create branch `pivot/societies` for everything below.

**Done when:** `git status` clean; lint + build pass.

## Phase 1 — Foundations: design system + app shell (1 session)

Goal: every screen renders properly again, before any data work. Screens keep their current logic.

1. `src/styles/tokens.css` — 9 colours with dark pairs (AA contrast), 5 font sizes, 3 radii, 4 spacing steps, one shadow, `color-scheme`.
2. `src/styles/base.css` — reset (`button { background:none }`), `.page` mobile padding + safe areas, one desktop sidebar block (offset only on pages with nav), no `body{overflow:hidden}`, reduced-motion.
3. `src/components/ui/` — `Button`, `Card`, `PageHeader`, `StatusBadge`, `TypeIcon`, `IncidentRow`, `Field` (input/select/textarea), `Switch`, `Segmented`, `Stepper`, `EmptyState`, `AlertBanner`, `Icon` (lucide wrapper with `aria-hidden`).
4. `src/config/society.js` — incident types (Lift, Fire, Medical, Water, Power/DG, Security) with label, icon, colour token, hazard weight; statuses; roles; labels. Replaces the 6 duplicated type maps.
5. App shell fixes:
   - Auth loading flag (`AuthContext.jsx:16`)
   - Mount `ErrorBoundary`
   - Remove Google Translate script and Material Symbols font from `index.html`; fix viewport meta
   - Apply dark mode at startup
6. Swap every Material icon and emoji to lucide; replace inline styles with the new components screen by screen.
7. Delete old `index.css` rules that are no longer used.

**Done when:** every screen looks styled on 375 px phone and 1280 px laptop, light and dark; no grey browser buttons; lint + build pass.

## Phase 2 — Supabase database (1–2 sessions, UI untouched)

All SQL lives in `supabase/migrations/` and runs with the Supabase CLI (`supabase db push`).

| Migration | Contents |
| --- | --- |
| `0001_enums.sql` | `user_role`, `incident_type`, `incident_status`, `priority_tier`, `power_state`, `zone_kind`, `asset_kind`, `asset_state`, `event_action` |
| `0002_tables.sql` | `societies`, `zones`, `flats`, `profiles`, `assets`, `hazard_weights`, `incidents`, `incident_events` + indexes |
| `0003_functions.sql` | `auth_role()`, `auth_society()`, `compute_urgency()` |
| `0004_triggers.sql` | new auth user → profile; before insert incident → force reporter, status, score, timestamps; after update → audit event |
| `0005_rls.sql` | RLS + column grants per role (resident / staff / manager); `anon` gets nothing |
| `0006_rpcs.sql` | `claim_incident` (`SELECT … FOR UPDATE`), `set_incident_status` (forward-only), `cancel_incident`, `reassign_incident`, `set_zone_power`, `set_role` |
| `0007_cron.sql` | `tick_incidents()` every 30 s: urgency age factor + escalation level |
| `0008_realtime.sql` | add `incidents`, `incident_events`, `zones`, `assets` to realtime |
| `seed.sql` | one society, 4 towers, lifts, pumps, DG, clubhouse, flats, 3 demo accounts (resident / staff / manager), a few incidents relative to `now()`, nightly `reset_demo()` |

Tests in `supabase/tests/` (pgTAP):
- each role can only see / change what it should
- two concurrent `claim_incident` calls → exactly one succeeds, other gets `already_claimed`
- status can only move forward; only assignee or manager can move it
- audit log row written for every claim / status change / escalation
- urgency rises with age; escalation level written by cron

**Done when:** all SQL tests pass against your Supabase project.

## Phase 3 — Connect the app to Supabase (1–2 sessions)

1. Add `@supabase/supabase-js`; `src/lib/supabase.js`; `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. `src/data/db.js` — one data module the screens import:
   `createIncident`, `listenIncident`, `listenMyIncidents`, `listenSocietyIncidents`, `claimIncident`, `setIncidentStatus`, `cancelIncident`, `listenZones`, `setZonePower`, `getProfile`, `updateProfile`.
   Errors are typed (`already_claimed`, `forbidden`, `offline`) — no more "returns [] on error".
3. `AuthContext` → Supabase Auth: `getSession` + `onAuthStateChange`, loading stays true until profile loads, role-based landing, demo buttons sign in to the seeded accounts.
4. Delete Firebase: `src/firebase/`, `firebase` + `firebase-tools` deps, `firebase.json`, `.firebaserc`, `.firebase/`, `firestore.rules`, `firestore.indexes.json`, `firebase-debug.log`.

**Done when:** sign in as each demo role works; a report filed on one device appears live on another; claim + resolve round-trip works; no `firebase` string left in `src/`.

## Phase 4 — Rebrand + simplified screens (2 sessions)

Routes and navigation (3 tabs per role):

| Role | Tabs | Pushed screens |
| --- | --- | --- |
| Resident | Home · History · Profile | SOS confirm sheet, Tracker |
| Staff | Alerts · History · Profile | — |
| Manager | Dashboard · Backup · Profile | — |

Routes: `/resident`, `/resident/history`, `/resident/sos/:id`, `/staff`, `/staff/history`, `/manager`, `/manager/backup`, `/profile`.

Screens:
1. **Resident Home** — hero "I'm stuck in a lift", 5 smaller types, active-SOS banner, Call security desk + Call 112, last 3 reports.
2. **SOS flow** — tap type → confirm sheet (tower/flat prefilled) → sent → Tracker. Optional details after sending (lift number, people).
3. **Tracker** — Sent → Guard on the way → Resolved (real status only), timeline from `incident_events`, call guard, cancel false alarm, safety tips per type.
4. **Staff Alerts** — on-duty switch; "Mine" on top, "Open" sorted by urgency; inline Claim → Reached → Resolved with quick note; call resident; sound + vibration on new alert.
5. **Manager Dashboard** — Open / Unclaimed / Avg response; needs-attention list with Assign; staff on duty.
6. **Manager Backup** — P1–P4 society loads with real power toggles; asset checklist (DG, lift ARD battery, pumps, last serviced).
7. **Profile** — real name, phone, tower/flat, role; dark mode + large text; log out. Staff: on-duty. Manager: society security number.
8. **Signup** — name, phone, tower, flat (role always resident; staff/manager set by manager).
9. **Landing** — one scroll page: problem (sourced stats from `problem-evidence.md`) → how it works → CTA.
10. **Cut** — Map screen, Active tab, onboarding slides, fake toggles, Clear Cache, NotFound animation.
11. Update `index.html` title/meta and PWA manifest to "Kavach — Society Emergency Response".

**Done when:** lift SOS → claimed → resolved takes 3–5 taps total; no campus wording left (`grep -ri campus src` empty).

## Phase 5 — Offline + caching (1 session)

- SOS outbox in IndexedDB with client-generated UUID (idempotent insert); "Queued — not delivered yet" state + call fallback after 10 s.
- Real connectivity check from Supabase realtime status + heartbeat.
- PWA `registerType: 'prompt'`, hourly update check, "New version — tap to reload" toast (never during an SOS).
- `vercel.json` headers: `/assets/*` immutable, HTML / `sw.js` / manifest `no-cache`; rewrite excludes `/assets`.
- PNG icons 192 / 512 / maskable / apple-touch-icon; theme-color meta.
- `devOptions.enabled: false`; navigate fallback denylist for auth callbacks.
- Logout clears cached profile, incidents, outbox and prefs.

**Done when:** airplane-mode SOS queues and sends on reconnect without duplicates; new deploy shows update toast.

## Phase 6 — Accessibility, polish, ship (1 session)

- aria labels, form labels, `role="alert"` errors, switch/tab semantics, dialog focus trap, 44 px targets.
- Route-level code splitting (bundle currently 500 KB).
- Final security review (RLS) + code review.
- Deploy to Vercel; update README and handover docs.

**Done when:** Lighthouse PWA + accessibility checks pass; demo works on phone and laptop from the live URL.

## Order and dependencies

```
Phase 0 → Phase 1 ──────────────┐
          Phase 2 (needs Supabase project) → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

Phase 1 and Phase 2 can run in parallel once you've created the Supabase project.
