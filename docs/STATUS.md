# Kavach — Project Status

**Last updated:** 2026-10-08 · **Branch:** `pivot/societies` (pushes go here, never `main`)

Legend: ✅ done · 🔄 in progress · ⏸️ blocked / waiting · ⬜ to do

## Right now (autonomous run, started 2026-10-08 ~15:00, user away 3 h)

| What | State | Who |
| --- | --- | --- |
| Supabase schema, RLS, RPCs, cron, realtime, seed, 6 demo accounts | ✅ applied via MCP, 28/28 permission tests pass | Claude |
| Firebase removed; app runs on Supabase Auth + DB | ✅ | Claude |
| PWA / caching / icons | ✅ | PWA agent |
| Resident screens + offline outbox | 🔄 | Resident agent |
| Responder screens + incident detail + alert sound | 🔄 | Responder agent |
| Admin screens (overview, incidents, team, society/power, insights, notices, safety check, board) | 🔄 | Admin agent |
| Profile + landing page | 🔄 | Profile agent |
| Push notifications (edge function + service worker) | 🔄 | Notifications agent |

GitHub commit budget for this run: 10 (pushed to `pivot/societies` only). Used: 1.

## Every request you've made

| # | Your request | Status | Where / next step |
| --- | --- | --- | --- |
| 1 | Ideas to pivot away from campus | ✅ | Chose apartment societies |
| 2 | Rebrand, simpler UI, debug everything | 🔄 | Phase 1 done; rebrand + simplified role screens in Phase 4 |
| 3 | Proven issues to show the problem | ✅ | `docs/problem-evidence.md` |
| 4 | Issues from Chennai / Bengaluru / South India | ✅ | Same doc, city sections |
| 5 | Doc with every reference link | ✅ | `docs/problem-evidence.md` (local, no claude.ai) |
| 6 | Nothing on Drive / claude.ai, everything local | ✅ | Cloud doc deleted; rule saved |
| 7 | Security review of the whole repo with subagents | ✅ | 2 candidates found, both below confidence bar; fixed anyway |
| 8 | Fix all bugs; what DB / stack are we on | ✅ | Bug-fix commit `9c31a42`; stack review in `rebrand-plan.md` |
| 9 | Move to Supabase completely | ✅ | Schema applied via MCP; Firebase deleted |
| 10 | Swarm of agents to check every button, cache, DB — report first | ✅ | 9 audits → `audit-and-fix-plan.md` |
| 11 | Agents for UI check | ✅ | Included in the 9 audits |
| 12 | Clear Zen / all caches, analyse what else to delete | ✅ | 225 MB → 3.9 GB free |
| 13 | Write a plan first | ✅ | `implementation-plan.md` |
| 14 | Do P0 + P1 | ✅ | Commits `92936b8`, `0d6a3b8` |
| 15 | How much space is left | ✅ | 3.9 GB free on `/home` |
| 16 | How to set up Phase 2 | ✅ | Answered; now via MCP |
| 17 | A better name than Kavach | ⏸️ | Kavach is crowded; **Towerly** recommended — **your call** |
| 18 | Logo concept | ✅ | Shield + tower + one red window (in app + favicon); redo if renamed |
| 19 | Demo society named simply (Alpha / Beta) | ✅ | Alpha Residency |
| 20 | Notification system | ⬜ | Phase 3.5 (push + in-app + optional SMS) |
| 21 | Which creds you need / can MCP do it | ✅ | Answered; MCP registered |
| 22 | Use Apple design skill + UI/UX Pro Max; current colours = ick | ✅ | Rebuilt on iOS system colours; **your visual check pending** |
| 23 | Push everything to GitHub | ✅ | Pushed |
| 24 | Pushes go to a branch, not `main` | ✅ | `pivot/societies`; rule saved |
| 25 | 2–3 more nav features; dashboards all look the same | 🔄 | Spec'd per role (`product-spec.md`); built in Phase 4 |
| 26 | Remove all hardcoded logins; 2 demo logins per role; lift responder vs other responder; admin sees everything; rules enforced | ✅ | 6 real accounts (`docs/demo-accounts.md`, local only); RLS tested 28/28 |
| 27 | Remove hardcoded reports; reporting UI shouldn't look like a shopping app | 🔄 | Spec'd ("What's happening?" list flow); built in Phase 4 |
| 28 | More, better feature ideas | ✅ | 8 proposed; 7 chosen + Tamil |
| 29 | Port the complete code from Firebase to Supabase | ✅ | `src/data/db.js`, Supabase Auth; Firebase removed |
| 30 | Use Supabase MCP, not CLI | ✅ | All migrations applied through MCP |
| 31 | Maintain a status file | ✅ | This file |
| 32 | Cache handling (from audit request) | 🔄 | PWA/caching hardening starting now (Phase 5 parts that don't need the DB) |

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

## Phase 2 — Supabase database ✅
- [x] Product spec (`docs/product-spec.md`)
- [x] `.env` (URL + publishable key), git-ignored
- [x] Supabase MCP connected
- [x] 11 migrations in `kavach-app/supabase/migrations/` applied via MCP (enums → tables → functions → triggers → RLS → RPCs → cron → realtime → home/push → RLS tuning)
- [x] Seed: Alpha Residency, 9 zones (P1–P4), 15 assets, 11 compliance checks (3 overdue), 7 contacts, 2 notices, **no incidents**
- [x] 6 demo accounts (2 residents, 2 responders: maintenance / security, 2 admins) — passwords only in local `docs/demo-accounts.md`
- [x] Security + performance advisors run; fixed search_path, trigger-function exposure, per-row auth calls, duplicate policies, 18 FK indexes
- [x] `scripts/smoke-test.mjs`: 28/28 pass (anon blocked, specialty visibility, concurrent claim → one winner, forward-only status, audit log, first responder, admin-only RPCs, asset permissions)
- [ ] Turn on leaked-password protection (Auth settings) — **you**

## Phase 3 — Port app from Firebase to Supabase ✅
- [x] `@supabase/supabase-js`, `src/lib/supabase.js`, `src/data/live.js` (realtime refetch), `src/data/db.js` (typed errors)
- [x] AuthContext on Supabase Auth; Login email/password only; no demo buttons or hardcoded profiles
- [x] Welcome screen: residents pick tower / floor / flat (`set_my_home` RPC)
- [x] Firebase deleted (code, deps, config, rules)
- [x] Routes: `/resident`, `/responder`, `/admin`, `/profile`, `/incident/:id`, `/board`; route-level code splitting
- [x] i18n framework (English + Tamil) with per-role string files

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
- 2026-10-08 — Autonomous run: schema applied + tested via MCP, Firebase removed, PWA hardened; role screens building in parallel
