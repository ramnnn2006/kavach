# Kavach handover

For a developer picking up the society version. Read the root `README.md` first for what the product does and how to run it.

## Where things are

| Need | Look at |
| --- | --- |
| What each role can do, navigation, data contract | `docs/product-spec.md` |
| Every table, RLS policy, RPC and trigger | `kavach-app/supabase/README.md` and `supabase/migrations/` |
| All client queries and RPC wrappers | `kavach-app/src/data/db.js` (the only module that should know table names; role-specific extras are in `data/resident.js`, `responder.js`, `admin.js`) |
| Realtime | `src/data/live.js`: `live(tables, fetcher, onData, onError)` refetches on any change, on reconnect and when the tab becomes visible |
| Offline reports | `src/data/outbox.js`: IndexedDB queue keyed by a client UUID; the server's `unique(reporter_id, client_id)` makes retries safe |
| Push | `src/lib/push.js` (subscribe), `src/sw.js` (show and tap), `supabase/functions/notify` (who gets what), migration `…1100` (trigger) |
| Strings | `src/i18n/strings/<area>.js`, each with `en` and `ta`; `useT()` gives `t('area.key', vars)` |
| Look and feel | `src/styles/tokens.css` (system colours, type sizes, dark mode), `components.css`, shared pieces in `src/components/ui/index.jsx` |
| Demo walkthrough | `docs/demo-guide.md` |
| Why this problem matters (sources) | `docs/problem-evidence.md` |

## Rules the code relies on

- **The database is the authority.** The client never writes status, timestamps, assignment, urgency or escalation. Triggers set them, and state changes go through RPCs that raise `already_claimed`, `forbidden`, `not_found` or `invalid`. `errorMessage(err, t)` turns those into user-facing text.
- **Status only moves forward:** pending → acknowledged → en_route → on_scene → resolved, with cancelled possible from any active state. Claiming locks the row (`select … for update`).
- **Visibility:**
  - Residents see their own reports.
  - Responders see reports that match their specialties or are assigned to them.
  - First responders also see active medical alerts.
  - Admins see everything in their society.
- **Escalation:** `tick_incidents()` runs every 30 s; level 2 after `escalate_l2_after` (2 min), level 3 after 5 min.
- **Screens:**
  - Every routed screen is `<main className="page">…<BottomNav /></main>`. BottomNav must be a direct child; it works out the active tab from the URL.
  - Design follows Apple HIG: grouped lists (`.card.settings-group` + `.settings-row`), large titles with `PageHeader`, system colours only.
  - No gradients, emoji or custom palettes.

## Before you push

```bash
cd kavach-app
npm run lint && npm run build
node scripts/smoke-test.mjs && node scripts/query-check.mjs
```

Then delete the smoke test's `[smoke-test]` incidents.

## Secrets

- `.env` holds only the URL, the publishable key and the VAPID public key.
- The VAPID private key and the hook secret live in Supabase Vault. Nothing else needs them.
- Demo passwords are in `docs/demo-accounts.md`, which is git-ignored.
- Never put the service_role key in the app or the repo.

## Known gaps

- **SMS / WhatsApp fallback:** not built. It needs a provider (MSG91 / Twilio) and DLT registration in India.
- **Society admin:** one society per deployment. Onboarding a new society (zones, flats, assets) is done in SQL; there is no admin UI for it yet.
- **Server error text:** some `invalid` messages carry English detail text from the server.
- **Bundle size:** the main chunk is about 640 kB, because supabase-js and all string files load up front. Screens are lazy-loaded.
