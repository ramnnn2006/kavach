# Kavach for Societies — Rebrand & Cleanup Plan

As of 2026-10-08. Evidence for the pitch lives in `problem-evidence.md`.

## 0. Current tech stack — verdict

| Layer | Now | Verdict |
| --- | --- | --- |
| UI | React 19 + Vite 7 + React Router 7 | Good, keep |
| Icons | Lucide (login only) + Material Symbols font (38 uses, 13 files) | Pick one: move all to Lucide |
| Styling | `index.css` tokens + ~290 inline `style={{}}` blocks | Messy; move to CSS classes during UI pass |
| Database | **Firebase Firestore (NoSQL)**, realtime `onSnapshot` | Works, but clashes with the **SQL course requirement** |
| Auth | Firebase Auth, email/password | Fine |
| Hosting | Vercel + Firebase Hosting both configured | Pick one (Vercel) |
| PWA | vite-plugin-pwa | Good, keep |
| Env | **No `.env` file** → app only runs in demo mode (in-memory data) | Needs a real backend project to demo live |
| Unused | `puppeteer` in dependencies, `fix_icons.js` | Remove |
| Misc | Google Translate script loaded via `//translate.google.com` (Tamil toggle) | Keep if wanted, load over `https://` |

### Database decision (needs your call)

- **Option A — Supabase (Postgres) — recommended.** Real SQL, so the course project is honest: tables, foreign keys, `SELECT … FOR UPDATE` claim lock, audit log table, row-level security replaces Firestore rules. Still has realtime subscriptions, so the live dashboard keeps working. Free tier is enough.
- **Option B — Stay on Firestore.** Least work, but you'd present a SQL design that the app doesn't use.

## 1. Bug fixes (in progress)

- [x] Firestore rules: owner check used `userId`, app writes `reporterUid`
- [x] Rules: incidents must be created as yourself, `pending`, unclaimed
- [x] Rules: only reporter or staff can read an incident
- [x] Sign-up wrote `"Student"` (capitalised) → rejected by rules; now always `student`, role picker demo-only
- [x] Responder claim used `userProfile.uid` (undefined) → used `user.uid`; Active Tasks was always empty
- [x] Tracker loaded the whole collection; now listens to one incident
- [x] Urgency score now matches documented 35/25/25/15 formula
- [x] Demo mode: listeners lost their filters after updates; new demo incidents had invalid timestamps
- [x] Remove `puppeteer`, run lint + build clean
- [ ] Deploy updated `firestore.rules` (only matters if staying on Firestore)

## 2. Rebrand: campus → society

### Vocabulary

| Campus | Society |
| --- | --- |
| Student | Resident |
| Responder | Staff (security guard / maintenance) |
| Admin | Facility manager / RWA committee |
| Campus | Society / community |
| Block A / Hostel 1 | Tower A / Tower B, Clubhouse, Basement |
| Exam Hall / Server Room (P1) | Lifts, water pumps, fire pumps (P1) |
| Power tab | Backup (DG) tab |

### Incident types

| Type | Hazard weight | Notes |
| --- | --- | --- |
| Fire | 100 | keep |
| Medical | 90 | keep |
| Lift stuck | 85 | raise — headline problem |
| Water outage | 65 | **new** (Bengaluru 2024 crisis) |
| Power / DG failure | 60 | rename from Power |
| Security | 70 | **new** (intruder, gate) |

### File-by-file

| File | Change |
| --- | --- |
| `src/config/society.js` (new) | One config: incident types, weights, zones + tiers, role labels, copy. Everything below reads from it |
| `App.jsx` | Routes `/student/*` → `/resident/*`, `/responder` → `/staff`, `/admin` → `/manager` |
| `StudentHome.jsx` → `ResidentHome.jsx` | SOS grid from config types; "My flat: Tower B-1204" |
| `ReportForm.jsx` | Building/floor lists → tower/floor/flat from config; zone criticality feeds score |
| `ResponderAlerts.jsx` → `StaffAlerts.jsx` | Wording only |
| `AdminDashboard.jsx` → `ManagerDashboard.jsx` | Power tab → Backup tab (DG load priority: lifts, pumps first) |
| `CampusMap.jsx` → `SocietyMap.jsx` | Drop SRM Google Maps iframe; simple tower layout card grid with live incident dots |
| `LandingPage.jsx` | New "Five Problems" from evidence doc (lifts, backup failures, water, floods/network, fire) |
| `firestore.js` | Seed zones → society zones; demo incidents → society examples |
| `firestore.rules` / SQL | Roles `resident`, `staff`, `manager` |
| `index.html`, `vite.config.js` manifest | Title/description "Kavach — Society Emergency Response" |
| `Login.jsx` | Copy + role names |

## 3. UI simplification

Principles: one primary action per screen, fewer cards, larger tap targets, no decorative glass on data screens.

- **Resident home:** one big SOS button → pick type (6 tiles) → confirm. Recent report status below. Nothing else.
- **Report form:** 3 fields max (where, how many people, optional note). Tower/flat prefilled from profile.
- **Tracker:** keep stepper + responder card; drop escalation jargon for residents.
- **Staff:** single list sorted by urgency, Claim / Resolve buttons inline.
- **Manager:** stats row + incident list + Backup tab. Drop the map tab until there's a real map.
- **Landing:** cut from 5 slides to 3 (problem, how it works, call to action).
- **Code:** replace Material Symbols with Lucide everywhere; move inline styles into ~15 reusable classes in `index.css`; remove the Material font link from `index.html`.

## 4. Order of work

1. Finish bug pass (lint + build green)
2. Decide database (A or B)
3. Add `society.js` config, rebrand screens + data
4. UI simplification screen by screen
5. If Supabase: schema + migration, swap `firestore.js` for `db.js` with the same function names
6. Update landing page with evidence, final pass on mobile + desktop
