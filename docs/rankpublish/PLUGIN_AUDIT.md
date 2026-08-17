# RankPublish — Plugin & Codebase Audit (Phase 0)

**Date:** 2026-08-17  
**Auditor scope:** Read-only. No plugin source modified.  
**Method:** Static analysis of repository + LocalWP RankPublish install.

---

## Executive summary

The RankPublish vision (SaaS + Connector + Plugin Adapters → ThinkRank / SchedulePress) spans **two separate codebases today**:

| Layer | Location | Status |
|-------|----------|--------|
| **SaaS web app** | `nashir/apps/web` (PublisherWP / Nashir) | Working MVP: auth, pairing, calendar, scheduling, social stubs, billing schema |
| **WordPress connector (Nashir)** | `nashir/apps/plugin` | Working: signed REST `nashir/v1`, pairing, sync, heartbeat — **does not call ThinkRank or SchedulePress** |
| **Merged RankPublish plugin** | LocalWP only: `…/plugins/rankpublish/` | v0.8.0 — embeds SchedulePress + ThinkRank (free + Pro). **No SaaS connector yet** (Account stub only) |
| **Upstream sources** | LocalWP: `wp-scheduled-posts`, `thinkrank`, etc. | Audited via merge reports + embedded copies |

**Critical gap:** The Nashir SaaS connector and the RankPublish merged plugin are not integrated. Nashir re-implements scheduling/social in its own REST layer instead of delegating to SchedulePress/ThinkRank adapters.

---

## 1. Repository structure (`nashir`)

```
nashir/
├── apps/
│   ├── plugin/          # PublisherWP WordPress plugin (v1.3.0) — SaaS connector
│   ├── web/             # Next.js 16 SaaS (Prisma + Postgres)
│   └── wp-theme/        # Marketing WordPress theme (not SaaS core)
├── deploy/
│   ├── contabo/         # Production deploy + RankPublish staging scripts
│   └── local/           # LocalWP QA for rankpublish-test site
└── docs/rankpublish/    # This audit (Phase 0 deliverables)
```

**Branding note:** README and plugin header say **PublisherWP**; deploy scripts and LocalWP use **RankPublish**. Treat as transitional naming — same product direction, different labels in code.

---

## 2. Nashir / PublisherWP WordPress plugin (`apps/plugin`)

### 2.1 Bootstrap

| Item | Value |
|------|-------|
| File | `apps/plugin/nashir.php` |
| Version | `1.3.0` (`NASHIR_VERSION`) |
| Text domain | `nashir` |
| PHP | ≥ 7.4 |
| WP | ≥ 6.0 |

### 2.2 Classes (all under `includes/`)

| Class | Role |
|-------|------|
| `Nashir_Plugin` | Orchestrator — boots all modules |
| `Nashir_REST` | Inbound signed REST API (`nashir/v1`) |
| `Nashir_Client` | Outbound HTTP to SaaS (activate, pair, sync, heartbeat) |
| `Nashir_Crypto` | HMAC request signing |
| `Nashir_License` | Vendor-site bypass + connection check |
| `Nashir_Sync` | Push post changes to cloud on `save_post` |
| `Nashir_Heartbeat` | WP-Cron ping to cloud |
| `Nashir_Schedule` | Local WP-Cron for unpublish/republish/advanced meta |
| `Nashir_Admin` | Settings UI, pairing flow |
| `Nashir_Metabox` | Post editor scheduling UI |
| `Nashir_Editors` | Advanced content update application |
| `Nashir_Calendar` | Admin calendar page |
| `Nashir_Dashboard` | Plugin dashboard widget |
| `Nashir_Social` | Social share hooks (local) |

**No adapter pattern.** No references to ThinkRank, SchedulePress, or RankPublish modules in plugin code.

### 2.3 REST API (`nashir/v1`)

All routes use HMAC signature verification (`X-Nashir-Timestamp`, `X-Nashir-Signature`).

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/health` | Site health + version + license status |
| GET | `/posts`, `/calendar` | List posts (same handler) |
| POST | `/publish` | Publish / unpublish / publish_keep_date |
| POST | `/unpublish` | Unpublish now or schedule via meta |
| POST | `/republish` | Republish now or schedule via meta |
| POST | `/schedule` | Set future status + date |
| POST | `/advanced` | Apply or schedule content update |
| POST | `/settings` | Update allowed post types, scheduler mode |

**Post meta used (Nashir-owned, not ThinkRank/SP):**

- `_nashir_unpublish_at`
- `_nashir_republish_at`
- `_nashir_advanced_at`

**Options:**

- `nashir_app_url`, `nashir_site_id`, `nashir_signing_secret`
- `nashir_allowed_types`, `nashir_scheduler_mode`
- `nashir_license_mode`, `nashir_vendor_license`

### 2.4 Connection flow (implemented)

1. User generates 6-char pairing code in SaaS (`POST /api/v1/pairing`)
2. Plugin calls `Nashir_Client::pair()` → `POST /api/v1/connect`
3. SaaS returns `site_id`, `api_key`, `signing_secret`
4. Plugin stores credentials; heartbeat + sync begin

Alternative: email/password activate → `POST /api/v1/license/activate`

### 2.5 What Nashir plugin does NOT do

- SEO metadata read/write
- Schema, sitemap, robots
- Social account OAuth (uses simplified local social in plugin + cloud `SocialAccount` model)
- Capability discovery
- Delegation to third-party plugins

---

## 3. Nashir SaaS web app (`apps/web`)

### 3.1 Stack

- Next.js (App Router), Prisma, PostgreSQL
- Session auth (`apps/web/src/lib/auth.ts`)
- Signed outbound calls to WordPress (`apps/web/src/lib/wordpress.ts`)

### 3.2 Database models (Prisma)

| Model | Purpose |
|-------|---------|
| `User`, `Workspace` | Account + tenant |
| `Site` | Connected WP site (url, restUrl, apiKeyHash, signingSecret) |
| `PairingCode` | 6-char handshake codes |
| `Subscription` | Trial/active/manual billing seat |
| `EditorialPost` | Cached WP posts |
| `ScheduleJob` | Queued publish/unpublish/republish/schedule/advanced |
| `SocialAccount`, `SocialTemplate`, `SocialShareJob` | Social layer (simplified) |

**Missing vs RankPublish spec:** `integrations`, `capabilities`, `action_logs`, `sync_states`, `api_tokens`, `billing_events`, `activity_logs` as first-class models.

### 3.3 API routes (implemented)

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/auth/login`, `register`, `logout` | Public/session | Account |
| `POST /api/v1/pairing` | Session | Generate pairing code |
| `POST /api/v1/connect` | Public (code) | Complete site handshake |
| `POST /api/v1/license/activate` | Public (credentials) | Direct activate |
| `GET/PATCH /api/v1/sites/[siteId]` | Session | Site CRUD |
| `POST /api/v1/sites/[siteId]/sync` | Session/cron | Pull posts from WP |
| `POST /api/v1/sites/[siteId]/heartbeat` | Signed from WP | Last seen |
| `PATCH /api/v1/sites/[siteId]/settings` | Session | Scheduler settings |
| `POST /api/v1/posts/[postId]/action` | Session | Queue WP action |
| `POST /api/v1/posts/[postId]/publish` | Session | Immediate publish |
| `GET/POST /api/v1/social` | Session | Social accounts/templates |
| `GET/POST /api/v1/billing` | Session | Subscription info |
| `POST /api/v1/subscriptions/[id]/unbind` | Session | Move seat to another site |
| `POST /api/cron/tick` | CRON_SECRET | Process jobs |
| `GET /api/health` | Public | Health check |

### 3.4 UI pages (implemented)

- Marketing: `/`, `/pricing`, `/download`, `/login`, `/register`
- App: `/app` (dashboard), `/app/calendar`, `/app/social`, `/app/settings`, `/app/billing`
- i18n: Arabic default + locale switch

### 3.5 Pricing (code vs spec)

| Spec | Code (`apps/web/src/lib/plans.ts`) |
|------|-------------------------------------|
| $9.90/mo, $99/yr | ✓ `990` / `9900` cents |
| 7-day trial | **Gap:** `TRIAL_DAYS = 14` |

### 3.6 Scheduler actions (Nashir-native)

`WP_ACTIONS`: `publish`, `unpublish`, `republish`, `schedule`, `advanced`, `publish_keep_date`

These map to `nashir/v1` REST — **not** to SchedulePress Pro advanced schedule or ThinkRank SEO endpoints.

---

## 4. RankPublish merged plugin (LocalWP — not in git repo)

**Path:** `C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/rankpublish/`  
**Version:** `0.8.0` (`RANKPUBLISH_VERSION`)  
**PHP:** ≥ 8.0

### 4.1 Architecture

Single plugin embedding four GPL modules:

| Module path | Source | Embedded version |
|-------------|--------|------------------|
| `modules/schedule/` | SchedulePress free | 5.3.3 |
| `modules/schedule-pro/` | SchedulePress Pro | 5.3.2 |
| `modules/seo/` | ThinkRank free | 1.31.0 |
| `modules/seo-pro/` | ThinkRank Pro | 2.0.2 |

Orchestrator: `RankPublish\Plugin` (`includes/class-plugin.php`)

Module wrappers: `includes/modules/class-{schedule,schedule-pro,seo,seo-pro}-module.php`

### 4.2 Conflict rules (verified in code)

- Skip embedded module if standalone source plugin is active
- Pro modules wait for free sibling on `plugins_loaded` priority 25
- Unified admin menu under `rankpublish` top-level
- WPDeveloper license UIs suppressed; replaced by `RankPublish\Account` stub

### 4.3 RankPublish core classes

| Class | Role |
|-------|------|
| `RankPublish\Plugin` | Module boot, admin menu, status dashboard |
| `RankPublish\Compat` | Detect/deactivate upstream plugins, migration ack |
| `RankPublish\Branding` | Admin brand CSS/JS, hide vendor logos |
| `RankPublish\Updates` | Update channel stub |
| `RankPublish\Account` | **Connect stub only** — no OAuth/pairing implementation |

### 4.4 Admin menu (when embedded modules loaded)

| Slug | Label (embedded) | Source module |
|------|------------------|---------------|
| `rankpublish` | Status | RankPublish core |
| `schedulepress` | Scheduler | SchedulePress |
| `schedulepress-calendar` | Calendar | SchedulePress |
| `thinkrank` | SEO Dashboard | ThinkRank |
| `thinkrank-essential-seo` | Essential SEO | ThinkRank |
| `thinkrank-ai-tools` | AI Tools | ThinkRank |
| `thinkrank-usages` | Usages | ThinkRank |
| `thinkrank-settings` | SEO Settings | ThinkRank |
| `thinkrank-license` | Account / License | RankPublish stub (replaces Pro license UI) |
| `thinkrank-migration` | Migration | ThinkRank (conditional) |
| `thinkrank_setup_wizard` | Setup Wizard | ThinkRank (onboarding) |

### 4.5 REST namespaces (embedded modules — unchanged upstream)

| Namespace | Owner |
|-----------|-------|
| `thinkrank/v1` | ThinkRank (50+ endpoint classes) |
| `thinkrank-pro/v1` | ThinkRank Pro |
| `wp-scheduled-posts/v1` | SchedulePress (PostPanel, etc.) |
| `wpscp/v1` | SchedulePress calendar/settings |

**No `rankpublish/v1` connector namespace exists yet.**

### 4.6 Existing documentation (LocalWP plugin)

| File | Content |
|------|---------|
| `docs/AUDIT.md` | Phase 1 upstream inventory (2026-08-16) |
| `docs/ARCHITECTURE.md` | Merge architecture + phase status |
| `docs/FEATURES.md` | Feature → source matrix |
| `docs/LEGAL.md` | GPL attribution requirements |
| `docs/MERGE-GUIDE.md` | Merge workflow |
| `docs/ROADMAP.md` | Phase 9+ roadmap |

### 4.7 QA evidence

- `deploy/local/reports/qa-rankpublish-test-2026-08-17.json` — product-mode QA on `rankpublish-test.local`
- `deploy/contabo/reports/audit-staging-all.json` — merge diff vs staging (all 4 modules `ok_hooks`)

---

## 5. Upstream plugin inventory (from embedded copies + AUDIT.md)

See dedicated files:

- [THINKRANK_CAPABILITIES.md](./THINKRANK_CAPABILITIES.md)
- [SCHEDULEPRESS_CAPABILITIES.md](./SCHEDULEPRESS_CAPABILITIES.md)

---

## 6. Cross-cutting findings

### 6.1 What already aligns with RankPublish spec

| Requirement | Evidence |
|-------------|----------|
| Local-first execution in WP | ThinkRank + SchedulePress run entirely in WP |
| Plugin engines not resold separately | RankPublish merges into one distributable |
| Pairing handshake pattern | Nashir SaaS + plugin implement code-based connect |
| Signed cloud ↔ site communication | HMAC in Nashir (reusable pattern) |
| Subscription + seat model | Prisma `Subscription` with site binding + unbind |
| ThinkRank capability API | `GET thinkrank/v1/capabilities` exists |
| Pricing amounts | $9.90 / $99 in `plans.ts` |

### 6.2 Gaps vs RankPublish spec

| Requirement | Status |
|-------------|--------|
| RankPublish Connector separate from engines | **Not built** — Nashir plugin ≠ RankPublish connector; merged plugin has no outbound SaaS API |
| Adapter layer (ThinkRankAdapter, SchedulePressAdapter) | **Not present** in any codebase |
| Dynamic capability-based SaaS dashboard | **Not present** — Nashir UI is static (calendar/social/settings) |
| Post workspace (SEO + Social + Schedule unified) | **Not present** in SaaS |
| Action system with idempotency keys | Partial — `ScheduleJob` exists without idempotency_key |
| Activity log | **Not present** as user-facing feature |
| 7-day trial | Code has 14 days |
| Legal/commercial gate for SaaS use of GPL engines | Documented in `docs/LEGAL.md` — **UNRESOLVED** |

### 6.3 Architectural decision required before Phase 1

**Option A — Evolve Nashir:** Rename/rebrand `apps/web` + `apps/plugin` to RankPublish; replace Nashir-native scheduling REST with adapters that proxy to ThinkRank/SchedulePress REST inside the merged plugin.

**Option B — New connector on merged plugin:** Add `rankpublish/v1` connector to merged plugin; build new SaaS app or fork Nashir web to use capability/action model.

**Option C — Dual plugin on customer sites:** Install merged RankPublish (engines) + thin Nashir-style connector — connector discovers modules and proxies actions.

Current merge docs (`rankpublish/docs/ARCHITECTURE.md` line 90) explicitly say: *"Do not reuse PublisherWP/nashir apps/web until product owner requests it."* — **Product owner has now requested RankPublish SaaS.** This decision point is open.

---

## 7. External dependencies & UNKNOWN items

| Item | Status |
|------|--------|
| SchedulePress OAuth middleware URLs | Present in SP code — exact production URLs **need runtime verification** |
| ThinkRank Google OAuth client IDs | Stored in options — **site-specific, not in repo** |
| WPDeveloper EDD license server | `api.wpdeveloper.com` — disabled in merged build |
| RankPublish.com production infra | **UNKNOWN** — staging uses `nashir.satest.top` |
| Card billing (Stripe/etc.) | **Not implemented** — manual/trial seats only |
| ThinkRank MCP server auth model for external SaaS | **Needs investigation** — uses WP admin capabilities today |

---

## 8. File reference index

### Nashir repo (in git)

- Plugin entry: `apps/plugin/nashir.php`
- REST: `apps/plugin/includes/class-rest.php`
- Client: `apps/plugin/includes/class-client.php`
- Schema: `apps/web/prisma/schema.prisma`
- Connect API: `apps/web/src/app/api/v1/connect/route.ts`
- Plans: `apps/web/src/lib/plans.ts`

### RankPublish plugin (LocalWP)

- Entry: `rankpublish.php`
- Orchestrator: `includes/class-plugin.php`
- Account stub: `includes/class-account.php`
- ThinkRank API manager: `modules/seo/includes/api/class-manager.php`
- SchedulePress PostPanel: `modules/schedule/includes/API/PostPanel.php`

---

## 9. Phase 0 conclusion

The **plugin engines** (ThinkRank + SchedulePress) are mature, REST-rich, and successfully embedded in RankPublish v0.8.0. The **SaaS layer** (Nashir) proves pairing, scheduling, and billing patterns but **does not integrate with those engines**.

Phase 1 architecture work must define how the Connector bridges SaaS actions to existing `thinkrank/v1` and `wp-scheduled-posts/v1` / `wpscp/v1` endpoints — without reimplementing their business logic in Nashir REST.

**Do not start UI work until adapter contracts and capability mapping are approved.**
