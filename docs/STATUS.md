# Kavach — Project Status

**Last updated:** 2026-10-08 · **Branch:** `pivot/societies` (pushes go here, never `main`)

Legend: ✅ done · 🔄 in progress · ⏸️ blocked / waiting · ⬜ to do

## Right now

| What | State | Who |
| --- | --- | --- |
| Supabase MCP login | ⏸️ waiting — run `/mcp` → supabase → Authenticate | **You** |
| Drafting database migrations + seed + 6 demo accounts | 🔄 in progress | Background agent |

## Decisions made

| Topic | Decision |
| --- | --- |
| Audience | Indian apartment societies (pivot from campus) |
| Database | Supabase (Postgres + Auth + Realtime + RLS + pg_cron), project `sbjigxnuqgfqriaaomkm`, via **Supabase MCP** |
| Design | Apple HIG: iOS system colours, grouped lists, SF / Inter type, lucide icons, no custom palettes |
| Demo data | Real Supabase accounts, 2 per role; no hardcoded logins, no fake reports, no in-memory demo mode |
| Demo society | Alpha Residency, Towers A–D |
| Roles | resident · responder (maintenance: lift/power/water · security: fire/medical/security) · admin (sees everything) |
| Language | English + Tamil |
| Product name | **Open** — Kavach (crowded name) vs Towerly (recommended) |
| Git | Feature branch `pivot/societies`; `main` untouched |

## Phase 0 — Save work ✅
- [x] Bug-fix commit on `main` (rules, signup role, claim uid, tracker, urgency, demo listeners, puppeteer removed)
- [x] Docs committed (evidence, audit, plans)
- [x] Branch `pivot/societies` created and pushed

## Phase 1 — Design system + app shell ✅
- [x] Apple HIG tokens (light + dark), base layout, component styles
- [x] Shared UI kit (`src/components/ui`), `src/config/society.js`, `src/utils/time.js`
- [x] Auth loading fix, ErrorBoundary mounted, Translate script + Material font removed, zoom allowed
- [x] All 11 screens restyled; fake escalation / outage mode / fake location / dead settings removed
- [x] Lint + build pass; committed `0d6a3b8`, pushed to branch
- [ ] Visual check in browser on phone + laptop, light + dark — **you**

## Phase 2 — Supabase database 🔄
- [x] Product spec with roles, rules, data contract, selected features (`docs/product-spec.md`)
- [x] `.env` (URL + anon key) and `.env.local` (DB password) written, git-ignored
- [x] Supabase MCP registered for this project
- [ ] ⏸️ MCP authenticated — **you**
- [ ] 🔄 Migrations drafted: enums, tables, functions, triggers, RLS, RPCs, cron, realtime
- [ ] Seed: society, zones, flats, assets, compliance checks, contacts, notices (no incidents)
- [ ] 6 demo accounts created (passwords only in local `docs/demo-accounts.md`)
- [ ] Review migrations
- [ ] Apply via MCP
- [ ] Run Supabase security + performance advisors, fix findings
- [ ] Test RLS per role and concurrent claim (exactly one wins)

## Phase 3 — Port app from Firebase to Supabase ⬜
- [ ] `@supabase/supabase-js`, `src/lib/supabase.js`
- [ ] `src/data/db.js` implementing the data contract (typed errors)
- [ ] AuthContext on Supabase Auth (session restore, profile load, role routing)
- [ ] Login: email/password only — remove all demo buttons and hardcoded profiles
- [ ] Remove in-memory demo data and demo mode
- [ ] Delete Firebase: `src/firebase/`, deps, `firebase.json`, `.firebaserc`, `.firebase/`, rules, indexes, debug log
- [ ] `.env.example` updated
- [ ] Routes renamed: `/resident`, `/responder`, `/admin`

## Phase 4 — Role features (3 agents in parallel) ⬜

### Resident
- [ ] Home: "Report an emergency", one-tap lift SOS, active report banner, Safety Check prompt
- [ ] Report flow: "What's happening?" list → location (prefilled tower/floor, lift picker) → review → send
- [ ] Tracker: real status steps, timeline from audit log, call responder, cancel false alarm, safety tips
- [ ] Reports history
- [ ] Notices
- [ ] Contacts (security desk, maintenance, managers, 112/101/108)
- [ ] Profile: phone, tower/flat, vulnerability flags, first-responder opt-in, language, display

### Responder
- [ ] Alerts: on-duty switch, Mine + Open (my specialties), urgency-sorted, claim → next step
- [ ] Checks: compliance checks due / overdue, log a check
- [ ] Assets: lifts/pumps/DG in my specialty, update status
- [ ] History: resolved by me, time to resolve
- [ ] First-responder "I'm coming" on medical alerts (resident opt-in)

### Admin
- [ ] Overview: Open / Unclaimed / In progress / Avg response; needs attention
- [ ] Incidents: all, filters, assign / reassign, change status
- [ ] Team: responders, specialties, on duty, load; change role / specialty
- [ ] Society: zones + P1–P4 tiers, **power-cut mode** (grid / DG), assets, compliance tracker
- [ ] Notices: post / delete
- [ ] **Safety Check**: start for tower / society, live safe / need-help / no-answer counts, end
- [ ] **Reports**: incidents by asset / zone / type, response times, repeat assets, printable post-incident report
- [ ] **Command board** `/board`: full-screen live view for security cabin

### Shared
- [ ] Nav configs per role (≤ 5 tabs, sidebar on desktop)
- [ ] English + Tamil strings
- [ ] Product name applied (index.html, manifest, Logo)

## Phase 3.5 — Notifications ⬜
- [ ] In-app: realtime + sound + vibration on new alert
- [ ] Web Push: VAPID keys, `push_subscriptions` table, service worker handler
- [ ] Edge Function: new SOS → on-duty responders of that specialty; status change → reporter; unclaimed 2 min → admins; medical → first responders; Safety Check → residents in scope
- [ ] Optional SMS / WhatsApp fallback (MSG91 / Twilio, needs DLT registration)

## Phase 5 — Offline + caching ⬜
- [ ] SOS outbox in IndexedDB with client UUID; "Queued" state + call fallback
- [ ] Real connectivity check
- [ ] PWA update prompt (`registerType: 'prompt'`), hourly update check
- [ ] Vercel cache headers; PNG / maskable / apple-touch icons; theme-color
- [ ] Logout clears caches

## Phase 6 — Polish + ship ⬜
- [ ] Accessibility pass, route code-splitting
- [ ] Security review (RLS) + code review
- [ ] Deploy to Vercel; README + handover docs updated
- [ ] **Rotate DB password and service_role key** (were pasted in chat) — **you**

## Waiting on you
1. `/mcp` → supabase → Authenticate
2. Product name: Kavach or Towerly (or another)
3. Visual check of Phase 1 at http://localhost:5173
4. After setup: rotate DB password + service_role key

## Log
- 2026-10-08 — Pivot to apartment societies chosen; evidence doc; 9-agent audit; disk cleanup (225 MB → 3.9 GB free)
- 2026-10-08 — Phase 0 + Phase 1 committed and pushed to `pivot/societies`
- 2026-10-08 — Supabase project created by user; MCP registered; feature set chosen (Safety Check, vulnerable residents, community first responders, compliance tracker, power-cut mode, command board, reliability reports, Tamil)
