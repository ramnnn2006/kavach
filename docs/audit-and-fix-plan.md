# Kavach — Full Audit & Fix Plan

As of 2026-10-08. Nine read-only audits: auth/routing, resident flow, staff/admin, landing/nav/components, cache/offline, database, UI responsive+a11y, UI design system, UX flow.
Nothing below has been fixed yet unless marked done.

## Why things feel broken — the 4 root causes

1. **Logged-in screens never load in demo mode.** `AuthContext.jsx:16` — `useState(!isFirebaseConfigured)` is inverted. With no `.env`, `loading` starts `true` and nothing ever sets it `false`, so every protected route shows the pulsing shield forever. In Firebase mode it's the reverse: refresh bounces you to `/login` and loses the URL.
2. **The CSS was gutted.** Commit `c7b0fea` ("liquid glass tokens") cut `index.css` from 796 → 413 lines and deleted ~45 classes the screens still use: `.btn*`, `.badge*`, `.toggle`, `.stepper`, `.tab-bar`, `.stat-*`, `.settings-*`, `.input-field`, `.page-header`, `.fade-up`, `@keyframes pulse`. Result: Send SOS / Sign In / Confirm are grey browser buttons, toggles are empty boxes, tracker stepper is plain text, badges are bare text. `.page` also has no mobile padding (edge-to-edge on phones), and desktop `body{overflow:hidden}` clips Login and Landing.
3. **Many features are fake.** They show UI but do nothing or show invented data (full list below).
4. **Statuses don't agree.** Staff write `en_route` / `on_scene`; tracker and My Reports only know `in_progress` (never written). Resident never sees staff progress.

## Fake or dead features (cut or make real)

| Feature | Reality |
| --- | --- |
| Tracker escalation ("Supervisor notified", "CRITICAL — All Admins") | Browser timer only; nobody notified; keeps climbing after resolve |
| Tracker steps "Acknowledged"/"En Route" | Tick on a timer even if no staff touched it |
| Admin "Activate Outage Mode" | Local state; visually changes nothing; can't undo |
| Admin Power tab | Read-only; no way to change a zone |
| Admin Map tab and `/map` screen | Hardcoded SRM college iframe + fake "Your Location" |
| Home "Campus Security hotline" | Dials 112 |
| Settings profile | Always "Test User / test@campus.edu" |
| Settings Push / Online toggles | Write localStorage, nothing reads them |
| Settings High Contrast / Large Text | No CSS exists |
| Settings Clear Cache | Removes 2 keys, claims to clear "offline maps" |
| Staff queue "priority sorted" | Sorted by time; urgency never shown |
| Urgency score | Zone always default, age always 0, never recalculated, client can set 100 |
| Connection banner "Retrying…" | Nothing retries; misses captive portals |
| Google Translate script | Never triggered; blocks page load; can crash React |
| Onboarding claims ("2 taps", "auto-assigned", "reroute power") | False |
| Demo sign-in / register | Any credentials → hard-coded person; typed name ignored |
| ErrorBoundary, EmptyStates, Spinner, useFormValidation | Never imported |

## Priority order

### P0 — Unblock the app now (small, safe, before migration)
- [ ] Fix auth loading flag (`AuthContext.jsx:16`)
- [ ] Persist demo session across reload (sessionStorage)
- [ ] Rebuild the missing CSS layer as a small new design system (see P2 tokens) rather than restoring the old 796-line file
- [ ] Base `button { background:none }`, mobile `.page` padding, desktop scroll fix
- [ ] Mount `ErrorBoundary` around routes
- [ ] Remove Google Translate script; fix viewport meta (allow zoom, `viewport-fit=cover`)
- [ ] One shared status enum: `pending → acknowledged → en_route → on_scene → resolved`
- [ ] Tracker: drive steps from status only; stop timer on resolve; "Incident not found" state; remove fake escalation copy
- [ ] Settings: real profile, BottomNav, remove toggles that do nothing

### P1 — Supabase foundation (database first, UI untouched)
- [ ] Supabase project + `supabase/migrations/`: enums → tables → indexes → helper functions → triggers → RLS → RPCs → cron → realtime → `seed.sql`
- [ ] Tables: `societies`, `zones` (P1–P4 tier, power status), `flats`, `profiles` (→ auth.users, role enum), `assets` (lifts, DG, pumps), `hazard_weights`, `incidents` (FKs to reporter, zone, flat, assignee), `incident_events` (append-only audit log)
- [ ] Triggers: new auth user → profile (role `resident`); before insert incident → force reporter/status/score/timestamps server-side; after update → write audit event
- [ ] RPCs: `claim_incident` (`SELECT … FOR UPDATE`, distinct `already_claimed` error), `set_incident_status` (forward-only, assignee or manager), `set_zone_power`, `reassign_incident`, `set_role`
- [ ] `pg_cron` every 30 s: recompute urgency age factor + write escalation level
- [ ] RLS per role: resident sees own incidents; staff/manager see own society; nobody writes the audit log directly
- [ ] SQL tests: RLS per role; two concurrent claims → exactly one wins
- [ ] `src/lib/supabase.js` + `src/data/db.js` (same function names the screens use now)
- [ ] AuthContext → Supabase Auth (`getSession` + `onAuthStateChange`, correct loading)
- [ ] Delete Firebase: `src/firebase/`, `firebase` dep, `firebase.json`, `.firebaserc`, `.firebase/`, `firestore.rules`, `firestore.indexes.json`; Vercel only

### P2 — Rebrand + simplified UI (per UX audit)
- [ ] `src/config/society.js`: incident types (Lift, Fire, Medical, Water, Power/DG, Security), weights, statuses, roles, labels, colours — replaces 6 duplicated type maps
- [ ] Design tokens: 9 colours (dark-mode pairs, AA contrast), 5 font sizes, 3 radii, 4 spacing steps; ~15 classes/components
- [ ] Lucide icons everywhere; drop Material Symbols font and all emoji
- [ ] Navigation: 3 tabs per role — Resident: Home · History · Profile; Staff: Alerts · History · Profile; Manager: Dashboard · Backup · Profile
- [ ] Cut: Map screen, separate Active tab, onboarding slides, NotFound animation; landing becomes one scroll page (sourced problem stats → how it works → CTA)
- [ ] Resident home: hero "I'm stuck in a lift", 5 smaller types, active-SOS banner, Security desk + 112 call buttons, recent reports
- [ ] SOS flow: tower/flat prefilled from profile → confirm → sent; details optional after
- [ ] Tracker: Sent → Guard on the way → Resolved; call guard; cancel false alarm; lift safety tips
- [ ] Staff: one list (Mine on top, Open sorted by urgency), inline Claim → Reached → Resolved, call resident, on-duty switch, alert sound
- [ ] Manager: Open / Unclaimed / Avg response stats, needs-attention list, staff on duty, Backup tab (P1–P4 society loads + asset checks)
- [ ] Signup collects tower, flat, phone; staff/manager by invite
- Critical path goes from 10–12 taps → 3–5 taps

### P3 — Offline and caching
- [ ] SOS outbox in IndexedDB with client UUID (idempotent retry); show "Queued — not delivered" + call fallback
- [ ] Real connectivity check (Supabase heartbeat / realtime state)
- [ ] PWA `registerType: 'prompt'` + hourly update check + "New version" toast (never reload mid-SOS)
- [ ] Vercel cache headers: `/assets/*` immutable; HTML, `sw.js`, manifest `no-cache`; don't rewrite missing `/assets` to index.html
- [ ] PNG icons 192/512 + maskable + apple-touch-icon + theme-color meta
- [ ] `devOptions.enabled: false`; navigateFallback denylist for auth callbacks
- [ ] Logout clears cached profile/incidents and per-user prefs; dark mode applied at startup

### P4 — Accessibility and polish
- [ ] `aria-label` on icon-only buttons; clear SOS button names; form labels; `role="alert"` on errors
- [ ] Switches with `role="switch"`, tabs with `aria-selected`, dialog focus trap
- [ ] 44 px tap targets; `prefers-reduced-motion`; AA contrast tokens
- [ ] Toasts above bottom nav on mobile
- [ ] Code-split by route (bundle is 500 KB)

## Decisions needed before starting

1. CSS: rebuild a small new design system (recommended) vs restore the old deleted CSS.
2. Supabase project: hosted (you create it, put URL + anon key in local `.env`) vs local CLI + Docker.
3. Demo mode after migration: seeded demo accounts in Supabase only (recommended) vs also an offline in-memory mock.
4. Commit today's fixes before starting P0?
