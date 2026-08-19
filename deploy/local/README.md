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

1. Copy `apps/web/.env.example` to `apps/web/.env`
2. Set `DATABASE_URL` to LocalWP MySQL (or the shared WordPress DB on staging)
3. `cd apps/web && npm install && npx prisma generate && node ../../deploy/contabo/run-staging-schema-safe.cjs . && npm run dev`

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

If PowerShell blocks `.ps1` scripts (`UnauthorizedAccess`), use the CMD wrapper from repo root.
In PowerShell you **must** prefix with `.\` (otherwise PowerShell treats `deploy` as a module name):

```powershell
.\rp-local.cmd sync --site rankpublish-test
.\rp-local.cmd qa --site rankpublish-test
```

Or from CMD:

```cmd
rp-local.cmd sync --site rankpublish-test
rp-local.cmd qa --site rankpublish-test
```

Direct Node (works everywhere):

```powershell
node deploy/local/sync-rankpublish-site.cjs --site rankpublish-test
node deploy/local/verify-thinkrank-local.cjs --site rankpublish-test
node deploy/local/qa-rankpublish.cjs --site rankpublish-test
```

`verify-thinkrank-local.cjs` does not require PHP/WP-CLI (use it when QA fails with `'php' is not recognized`).

### First-time test site setup

1. Create site in Local (e.g. `rankpublish-test.local`).
2. Start the site once so `.envrc` exists.
3. `node deploy/local/setup-rankpublish-test.cjs` — or use `switch-product-mode.cjs product --site rankpublish-test --sync`.

### QA checklist (automated)

```powershell
# Product-only site (rankpublish-test.local)
node deploy/local/qa-rankpublish.cjs --site rankpublish-test

# Dev stack site (rankpublish.local — upstream + rankpublish-site)
node deploy/local/qa-rankpublish.cjs --site rankpublish
```

Reports: `deploy/local/reports/qa-<site>-YYYY-MM-DD.json`

The QA script auto-detects **product** vs **dev** mode and runs the matching checklist. Dev mode validates `rankpublish-site` + upstream ThinkRank/SchedulePress; product mode validates the unified `rankpublish` plugin.

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

### Database connection error

If you see **"Error establishing a database connection"**:

1. **Start the site** in Local (green "Running" state).
2. **Run from the nashir repo** — NOT from `app\public`:

```powershell
cd C:\Users\drmoh\Projects\nashir
.\deploy\local\rp-local.ps1 fix-db --site rankpublish-test
```

From Local Site Shell (any folder):

```powershell
powershell -File C:\Users\drmoh\Projects\nashir\deploy\local\rp-local.ps1 fix-db --site rankpublish-test
```

Check `wp-config.php`: `DB_NAME` must be `local` and `DB_HOST` must be `127.0.0.1:PORT` where PORT matches Local → Site → Database tab.

| Site | Expected `DB_NAME` | Notes |
|------|-------------------|--------|
| `rankpublish.local` | `rankpublish_saas` | Shared WP + SaaS (`wp_*` + `rp_*`) |
| `rankpublish-test.local` | `local` | Standalone customer test WP only |

**Do not** point `rankpublish-test` at `rankpublish_saas` — it uses its own WordPress database.

Expected: single plugin **rankpublish 0.8.0**, menu **RankPublish** with Scheduler, Calendar, SEO, Account.
