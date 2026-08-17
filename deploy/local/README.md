# Local PublisherWP

## Environment map

| Role | URL |
|------|-----|
| **SaaS (staging live)** | https://nashir.satest.top |
| **Local WP dev stack** | https://rankpublish.local |
| **Customer test WP** | https://rankpublish-test.local |
| **Production (future)** | https://rankpublish.com |

Pairing on `rankpublish-test.local` always uses **https://nashir.satest.top** as Cloud app URL (not localhost).

Local `npm run dev` on `:3000` is for developers editing code only — not the user-facing trial URL.

## Setup (developers only)

1. Start Postgres: `docker compose -f deploy/local/docker-compose.yml up -d`
2. Copy `apps/web/.env.example` to `apps/web/.env`
3. Set `DATABASE_URL=...` and `APP_URL=https://nashir.satest.top`
4. `cd apps/web && npm install && npx prisma db push && npm run dev`

WordPress customer test site: `rankpublish-test.local` with RankPublish plugin 0.9+.

## RankPublish product QA (`rankpublish-test.local`)

Site for **RankPublish only** — no upstream SchedulePress/ThinkRank plugins.

### Switch modes (one command)

```powershell
# Dev stack on rankpublish.local (upstream + site core)
node deploy/local/switch-product-mode.cjs dev --site rankpublish

# Product-only on rankpublish-test.local (sync latest plugin from rankpublish site)
node deploy/local/switch-product-mode.cjs product --site rankpublish-test --sync

# Show active plugins + detected mode
node deploy/local/switch-product-mode.cjs status --site rankpublish-test
```

### First-time test site setup

1. Create site in Local (e.g. `rankpublish-test.local`).
2. Start the site once so `.envrc` exists.
3. `node deploy/local/setup-rankpublish-test.cjs` — or use `switch-product-mode.cjs product --site rankpublish-test --sync`.

### QA checklist (automated)

```powershell
node deploy/local/qa-rankpublish.cjs --site rankpublish-test
```

Report: `deploy/local/reports/qa-rankpublish-test-YYYY-MM-DD.json`

### Connector tests

```powershell
# Public health + capabilities (WP-CLI, no HTTP)
wp eval-file deploy/local/qa-check.php connector --path="C:\Users\drmoh\Local Sites\rankpublish-test\app\public"

# Signed REST (seeds temp secret, hits /capabilities + /posts)
node deploy/local/test-signed-rest.cjs --site rankpublish-test

# Full pairing E2E (staging SaaS + rankpublish-test.local)
node deploy/local/test-pairing-e2e.cjs --site rankpublish-test
```

Login: `http://rankpublish-test.local/wp-admin/` — user `admin`.

Expected: single plugin **rankpublish 0.8.0**, menu **RankPublish** with Scheduler, Calendar, SEO, Account.
