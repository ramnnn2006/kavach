# Kavach

Emergency response for apartment societies. A resident taps once to report a stuck lift, a fire, a medical emergency, a security problem, a power cut or a water problem. The right guard or technician gets the alert with the tower, floor and flat. Everyone sees who has taken it and how far along it is. Unanswered alerts go up to the committee automatically.

Built as an installable web app (PWA) for Android and iPhone, in English and Tamil. The demo society is *Alpha Residency*, Chennai (Towers A–D).

## Who uses it

| Role | What they get |
| --- | --- |
| **Resident** | Report an emergency in two taps (one for a stuck lift), live tracker, report history, notices, emergency contacts, Safety Check replies. Can mark vulnerable people at home (elderly, wheelchair, medical device, infant) so responders know before they arrive. Doctors and nurses can opt in as community first responders for medical alerts. |
| **Responder** | Alerts for their specialties only. Maintenance staff see lift, power and water; security staff see fire, medical and security. Claim an alert, then mark *On the way → Reached → Resolved*. Equipment status, compliance checks due, own history, on-duty switch and an alert sound. |
| **Admin** (RWA committee, facility manager) | Sees everything. Assign and reassign alerts, team and specialties, power-cut mode (grid / DG with P1–P4 area priority), equipment and compliance tracker, notices, Safety Check roll call, reliability reports, and a full-screen command board for the security cabin. |

## Features

- **Specialty routing.** Each alert goes to on-duty responders whose specialty matches. The database enforces this, not the app.
- **One claim wins.** If two people press Claim at the same time, exactly one gets it; the other is told who took it.
- **Escalation.** Level 2 if unclaimed after 2 minutes (admins notified), level 3 after 5 minutes. A scheduled job runs every 30 seconds.
- **Urgency score.** Based on hazard, area priority, people affected, waiting time and whether a vulnerable person is involved.
- **Safety Check.** The committee asks a tower or the whole society "Are you safe?". Residents answer *I'm safe* or *I need help*, and a *need help* reply becomes an alert automatically. Live counts show who hasn't answered.
- **Power-cut mode.** On DG power, P1 areas (pumps, gate) and P2 (towers) stay on, P3 rotates and P4 is cut. Residents see a notice.
- **Compliance tracker.** Lift licences, ARD battery tests, DG servicing, fire equipment, with due and overdue dates.
- **Push notifications.** Web Push for new alerts, status changes, escalations, medical alerts to first responders and Safety Checks, in the user's language.
- **Works offline.** A report made without signal is queued on the phone and sent when the network returns, without creating duplicates. A *Call security desk* button is always shown.
- **Audit trail.** Every claim, status change, assignment and cancellation is logged with who did it and when. Admins can print an incident report.

## Tech

- React 19 + Vite 7, plain CSS following Apple's Human Interface Guidelines (system colours, Dynamic Type sizes, dark mode, larger text), lucide icons.
- Supabase: Postgres 17 with row-level security on every table. All writes go through `SECURITY DEFINER` functions, and triggers own the server-side fields. Also used: Auth (email + password), Realtime, `pg_cron`, `pg_net`, Vault, and an Edge Function for Web Push.
- `vite-plugin-pwa` (custom service worker, prompt to update), deployed on Vercel.

```
kavach-app/
  src/
    screens/        resident/, responder/, admin/, shared/ (one folder per role)
    data/           db.js (all queries + RPC wrappers), live.js (realtime), outbox.js (offline queue)
    i18n/strings/   English + Tamil strings per area
    styles/         tokens.css, components.css, one stylesheet per role
    sw.js           service worker (caching + push)
  supabase/
    migrations/     schema, RLS, RPCs, cron, realtime, push (apply in order)
    functions/notify/  Web Push edge function
    seed.sql        demo society: zones, flats, lifts, DG, pumps, checks, contacts
  scripts/
    smoke-test.mjs  28 live permission checks
    query-check.mjs checks the app's queries against the live schema
docs/
  product-spec.md, demo-guide.md, problem-evidence.md
```

## Run it locally

```bash
cd kavach-app
npm install
cp .env.example .env        # fill in the three values below
npm run dev                 # http://localhost:5173
```

`.env` needs:

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same page, publishable key. Never put the secret / service_role key in a `VITE_` variable. |
| `VITE_VAPID_PUBLIC_KEY` | Public Web Push key (see below). Leave empty to run without push. |

## Set up a Supabase project

1. Apply `kavach-app/supabase/migrations/*.sql` in filename order (`supabase db push`, or paste them into the SQL editor), then `seed.sql`.
2. Create users through Auth. A new user becomes a resident and picks their tower and flat on first sign-in. Make staff and admins with `update_member()` as an admin, or in SQL.
3. Push notifications (optional):
   - Generate keys with `npx web-push generate-vapid-keys --json`.
   - Store them with the four `vault.create_secret` calls listed at the top of `20261008001100_notifications.sql`.
   - Deploy `supabase/functions/notify` with JWT verification off; it checks its own secret header instead.
   - Put the public key in `VITE_VAPID_PUBLIC_KEY`.
4. In Auth settings, turn on leaked-password protection.

Details of every table, policy and function are in [`kavach-app/supabase/README.md`](kavach-app/supabase/README.md).

## Checks

```bash
cd kavach-app
npm run lint
npm run build
node scripts/smoke-test.mjs    # needs .env and the local demo-accounts file
node scripts/query-check.mjs
```

The smoke test signs in as each demo role and checks what each one can and cannot see or change. Its test reports are tagged `[smoke-test]`; delete them afterwards (see `docs/demo-guide.md`).

## Deploy

Vercel, with `kavach-app` as the root directory. Set the three `VITE_` variables in the project's environment settings. `vercel.json` adds the SPA rewrite, security headers and cache rules.

## Demo

See [`docs/demo-guide.md`](docs/demo-guide.md) for a five-minute walkthrough with three windows (resident, responder, admin). Demo passwords are kept out of the repository.

Kavach does not replace 112. Every report screen also offers a direct call to 112 and the security desk.
