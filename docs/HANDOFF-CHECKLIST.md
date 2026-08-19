# RankPublish / Nashir — Handoff Checklist

**Date:** 2026-08-18  
**Purpose:** Freeze current work; next agent reviews and completes without scope drift.  
**Repo:** `drmohamedhussein/nashir`  
**Staging:** https://nashir.satest.top  
**Local (user):** `rankpublish.local`, `rankpublish-test.local` (LocalWP on Windows)

---

## 0. Rules for the next agent

1. **One task per turn** — user pays per agent run; no drive-by refactors.
2. **Do not deploy** unless user explicitly asks.
3. **Do not merge PRs** unless user explicitly asks.
4. **Never commit** SSH passwords or `.env` secrets.
5. **Never run** `prisma db push --accept-data-loss` on staging (drops `wp_*` tables). Use `deploy/contabo/apply-staging-schema-safe.cjs`.
6. **Source of truth:** this monorepo (`nashir`), not `drmohamedhussein/rankpublish` (Manus).
7. Read before coding: `docs/rankpublish/INTEGRATION_MAP.md`, `PLUGIN_AUDIT.md`, `SCHEDULEPRESS_CAPABILITIES.md`, `THINKRANK_CAPABILITIES.md`.

---

## 1. Product goal (what the user actually wants)

| Area | Target |
|------|--------|
| Marketing | WordPress `rankpublish-site` at `/`, `/pricing`, etc. |
| SaaS app | Next.js `apps/web` at `/app`, `/api`, `/login`, `/register` |
| Pricing | Flat **$9.99/mo · $99/yr** per site (plan id: `starter`) |
| Billing | **PayPal** Subscriptions (Stripe removed); wiring deferred until core complete |
| WordPress Core admin | `rankpublish-core-scheduler` and `rankpublish-core-seo` show **four upstream plugin UIs** with **RankPublish branding** (not SchedulePress/ThinkRank logos/names) |
| Dev stack (rankpublish.local) | Four plugins active: `wp-scheduled-posts`, `wp-scheduled-posts-pro`, `thinkrank`, `thinkrank-pro` + `rankpublish-site`; merged `rankpublish` plugin **inactive** |
| Deploy target | **nashir.satest.top** + localhost until rankpublish.com DNS |

---

## 2. Architecture (current)

```
nashir.satest.top / rankpublish.local
├── WordPress + rankpublish-site → marketing (/, /pricing, …)
├── Next.js apps/web → /app, /api, /login, /register
│   └── proxied via wordpress/mu-plugins/rankpublish-saas-proxy.php → 127.0.0.1:3001
└── MySQL shared: wp_* (WordPress) + rp_* (SaaS Prisma)
```

---

## 3. Git / PR state (as of handoff)

| Branch | Status | Notes |
|--------|--------|-------|
| `master` | Merged PR #1 (full migration), PR #2 (iframe embed) | Plugin version in repo: **1.6.2** on master |
| `cursor/native-module-brand-ca46` | **2 commits ahead of master**, PR #3 **DRAFT** | **1.6.4** — native module wrap + RP logo + critical fix; **deployed to staging** |
| `cursor/embed-upstream-plugin-uis-ca46` | Merged to master | Superseded by native-module branch |

**Action for next agent:** Decide with user: merge PR #3 to master or revert staging to master.

---

## 4. Staging verification snapshot (2026-08-18)

| URL | Expected |
|-----|----------|
| `/` | 200 |
| `/api/health` | 200, DB connected |
| `/app` | 307 → login |
| `/wp-admin/` | 302 → login (not 500) |
| `rankpublish-site` version (SSH) | **1.6.4** (`node deploy/contabo/verify-site-core.cjs`) |

**Known incident:** 1.6.3 caused wp-admin **critical error** — missing `return $url` in `filter_upstream_logo_assets()`. Fixed in **1.6.4**.

---

## 5. What is DONE (do not redo)

- [x] Monorepo migration (apps/web, apps/rankpublish-site, apps/rankpublish connector stubs)
- [x] Prisma schema: workspaces, sites, billing, commands, SEO audits, etc.
- [x] 38+ API routes in `apps/web`
- [x] PayPal billing module (`apps/web/src/lib/billing.ts`) with mock when keys unset
- [x] Flat pricing $9.99/$99 in seed and marketing
- [x] mu-plugin SaaS proxy (`wordpress/mu-plugins/rankpublish-saas-proxy.php`)
- [x] Deploy scripts: `deploy/contabo/deploy-all.cjs`, `deploy-rankpublish-site.cjs`, `apply-staging-schema-safe.cjs`
- [x] Local scripts: `deploy/local/rp-local.ps1`, `sync-rankpublish-site.cjs`, `switch-product-mode.cjs`
- [x] Module embed started: `includes/class-module-embed.php` (native OS wrap, no iframe on branch)

---

## 6. What is BROKEN or INCOMPLETE (priority order)

### P0 — Must fix before anything else

- [ ] **Manual QA after login** on staging:
  - https://nashir.satest.top/wp-admin/admin.php?page=rankpublish-core-scheduler
  - https://nashir.satest.top/wp-admin/admin.php?page=rankpublish-core-seo
  - Confirm: no 500, no double scroll, upstream React loads, sidebar stays RankPublish OS
- [ ] **RankPublish branding on React UIs** — user still sees ThinkRank/SchedulePress logos and copy inside module views. Files: `includes/class-branding.php`, `assets/branding/admin-overrides.js`, `admin-overrides.css`. React may re-render logos after JS runs — needs live DOM inspection.
- [ ] **Merge or rollback** — staging runs 1.6.4 from unmerged branch; master is 1.6.2. Align git with production.

### P1 — Core product (original plan)

- [ ] **Connector** — `rankpublish-connector` package + site pairing end-to-end (see `INTEGRATION_MAP.md` §2 — mostly MISSING)
- [ ] **PayPal live keys** — user deferred; mock billing works
- [ ] **Trial days** — docs say 7-day; some code may still say 14 — audit `apps/web`
- [ ] **rankpublish merged product** — `apps/rankpublish/` is partial (connector only); full merged plugin not in repo

### P2 — Polish

- [ ] Duplicate license notices on module pages
- [ ] Dev stack page visibility (`dev_stack_mode` — deploy script sets `false` on staging)
- [ ] Re-deploy SaaS after schema changes only via safe migration

---

## 7. Key files map

| Task | Path |
|------|------|
| Core admin pages | `apps/rankpublish-site/includes/class-admin.php` |
| Publishing OS shell | `apps/rankpublish-site/includes/class-admin-os.php` |
| Module native wrap | `apps/rankpublish-site/includes/class-module-embed.php` |
| Branding / logo rewrite | `apps/rankpublish-site/includes/class-branding.php`, `assets/branding/*` |
| Module registry | `apps/rankpublish-site/data/modules.json` |
| SaaS app | `apps/web/` |
| Prisma | `apps/web/prisma/schema.prisma`, `seed.cjs` |
| SaaS proxy | `wordpress/mu-plugins/rankpublish-saas-proxy.php` |
| Staging deploy | `deploy/contabo/deploy-all.cjs` |
| Local sync | `deploy/local/sync-rankpublish-site.cjs`, `rp-local.ps1` |

### Upstream admin page slugs (for embed/wrap)

| Plugin | Page slugs |
|--------|------------|
| SchedulePress | `schedulepress`, `schedulepress-calendar` |
| ThinkRank | `thinkrank`, `thinkrank-essential-seo`, `thinkrank-settings`, `thinkrank-ai-tools` |

### OS wrap query flags (branch 1.6.4)

- `rpsite_os=1` — wrap upstream page in Publishing OS shell
- `rpsite_ctx=scheduler|seo` — sidebar highlight + tab set

---

## 8. Commands reference

### Staging deploy (only when user asks)

```powershell
$env:NASHIR_SSH_HOST='...'
$env:NASHIR_SSH_USER='...'
$env:NASHIR_SSH_PASS='...'
node deploy/contabo/deploy-rankpublish-site.cjs   # marketing plugin only
node deploy/contabo/deploy-all.cjs                # full stack
```

### Local (user Windows, from repo root)

```powershell
git pull
node deploy/local/sync-rankpublish-site.cjs --site rankpublish
.\deploy\local\rp-local.ps1 dev --site rankpublish
.\deploy\local\rp-local.ps1 status --site rankpublish
```

### Verify staging

```bash
node deploy/contabo/verify-site-core.cjs
curl -sS -o /dev/null -w "%{http_code}" https://nashir.satest.top/api/health
```

---

## 9. User decisions (do not revisit without asking)

| Topic | Decision |
|-------|----------|
| Pricing | $9.99/mo · $99/yr flat |
| Billing | PayPal (not Stripe); defer live keys |
| Deploy | nashir.satest.top + local until launch |
| Manus repo | Not needed; nashir is source of truth |
| OpenLiteSpeed proxy | Use mu-plugin proxy, not OLS external app |

---

## 10. Suggested first prompt for the next agent

```
Read docs/HANDOFF-CHECKLIST.md and docs/rankpublish/INTEGRATION_MAP.md.

Do NOT deploy or merge unless I say so.

Task 1 only: Log into staging mentally via code review, then fix RankPublish 
branding inside rankpublish-core-scheduler and rankpublish-core-seo so no 
SchedulePress/ThinkRank logos or names appear in the React UI. Verify the 
native module wrap (rpsite_os=1) does not cause double scroll or PHP errors.

Branch: cursor/native-module-brand-ca46 (1.6.4). Show me a minimal diff plan 
before implementing.
```

---

## 11. Failures to avoid (from previous agent)

1. Shipping PHP functions with `: string` return type but no return on all paths → **critical error**.
2. iframe embed for React SPAs → double scroll; user rejected this approach.
3. Running `prisma db push --accept-data-loss` on staging → **dropped wp_* tables** once; use safe SQL migration only.
4. Deploying without user approval → wastes trust and credits.
5. Renaming UI to "SchedulePress workspace" / "ThinkRank workspace" — user wants **RankPublish** everywhere.

---

*End of handoff. User chose option C — freeze and hand off.*
