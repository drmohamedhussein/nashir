# RankPublish — Integration Map

**Date:** 2026-08-17  
Maps RankPublish SaaS features → adapter actions → engine APIs → UI sections.

Legend:
- **Status:** `EXISTS` (engine API live), `PARTIAL` (Nashir has overlap but wrong engine), `MISSING` (not built), `STUB` (placeholder only)
- **Engine:** TR = ThinkRank, SP = SchedulePress, WP = WordPress core

---

## 1. Integration registry

| Integration ID | Engine | Embedded path | Version | Standalone basename |
|----------------|--------|---------------|---------|---------------------|
| `thinkrank` | ThinkRank free | `modules/seo/` | 1.31.0 | `thinkrank/thinkrank.php` |
| `thinkrank-pro` | ThinkRank Pro | `modules/seo-pro/` | 2.0.2 | `thinkrank-pro/thinkrank-pro.php` |
| `schedulepress` | SchedulePress free | `modules/schedule/` | 5.3.3 | `wp-scheduled-posts/wp-scheduled-posts.php` |
| `schedulepress-pro` | SchedulePress Pro | `modules/schedule-pro/` | 5.3.2 | `wp-scheduled-posts-pro/wp-scheduled-posts-pro.php` |
| `rankpublish-core` | RankPublish shell | `includes/` | 0.8.0 | `rankpublish/rankpublish.php` |
| `rankpublish-connector` | SaaS bridge | — | — | **MISSING** |

---

## 2. Site connection flow

| Step | Component | Status | Notes |
|------|-----------|--------|-------|
| User adds website URL | SaaS UI | PARTIAL | Nashir pairing panel exists |
| Generate pairing code | `POST /api/v1/pairing` | EXISTS | 6-char code, 15min expiry |
| Plugin submits code | `Nashir_Client::pair()` | EXISTS | Calls `/api/v1/connect` |
| Store credentials | WP options | EXISTS | `nashir_site_id`, `nashir_signing_secret` |
| Trial/subscription bind | Prisma Subscription | EXISTS | Auto-trial on first connect |
| Capability discovery | Connector → SaaS | **MISSING** | ThinkRank has `/capabilities` to wrap |
| Integration version report | Connector health | **MISSING** | RankPublish status page is WP-admin only |

**Migration note:** Rename options `nashir_*` → `rankpublish_*` or support both during transition.

---

## 3. Feature integration matrix

### 3.1 Account & billing

| RankPublish feature | SaaS (Nashir) | Connector | Engine | Status |
|---------------------|---------------|-----------|--------|--------|
| Register / login | `auth/*` | — | — | EXISTS |
| Subscription $9.90/$99 | `plans.ts`, `billing` | — | — | EXISTS (no card billing) |
| 7-day trial | — | — | — | **GAP:** 14 days in code |
| Seat per site | `Subscription.siteId` | — | — | EXISTS |
| Unbind site | `subscriptions/unbind` | — | — | EXISTS |
| Connect & activate UI | — | `Account` stub | — | STUB |

### 3.2 Websites & posts

| RankPublish feature | SaaS | Connector action | Engine API | Status |
|---------------------|------|------------------|------------|--------|
| List sites | `/app` | — | — | EXISTS |
| List posts | calendar sync | `posts.list` | WP_Query via connector | PARTIAL (Nashir REST only) |
| Get post | — | `posts.get` | WP + adapters enrich | MISSING |
| Post workspace shell | — | — | — | MISSING |

### 3.3 SEO (ThinkRank adapter)

| RankPublish UI | Capability ID | Engine REST | Status |
|----------------|---------------|-------------|--------|
| SEO → Overview | `seo.overview` | TR dashboard data APIs | EXISTS (admin SPA) |
| SEO title / description | `seo.post.read/write` | `/metadata/{id}` | EXISTS |
| Focus keyword | `seo.keyword.*` | Focus keyword endpoints | EXISTS |
| SEO score | `seo.score.*` | `/seo-score/*` | EXISTS |
| Schema | `seo.schema.*` | `Schema_Endpoint` | EXISTS |
| Sitemap | `seo.sitemap.*` | `Sitemap_Endpoint` | EXISTS |
| Robots / global meta | `seo.robots.*` | `Global_Robot_Meta_Endpoint` | EXISTS |
| Social metadata (OG) | `seo.social_meta.*` | `Social_Media_Endpoint` | EXISTS |
| Content analysis | `seo.analyze.*` | `/seo-analyzer/*` | EXISTS |
| AI tools | `seo.ai.*` | `/ai/*` | EXISTS |
| Site identity | `seo.identity.*` | `Site_Identity_Endpoint` | EXISTS |
| Image SEO | `seo.images.*` | `Image_SEO_Endpoint` | EXISTS |
| Instant indexing | `seo.indexing.*` | `Instant_Indexing_Endpoint` | EXISTS |
| Google integration | `seo.integrations.google` | `Integrations_Endpoint` | EXISTS |
| Importers | `seo.import.*` | `Import_Controller` | EXISTS |
| Rank tracker | `seo.rank.*` | `/rank-tracker/*` | EXISTS (Pro) |
| Redirects / 404 | `seo.redirects.*` | `/redirections/*` | EXISTS (Pro) |
| Broken links | `seo.links.broken.*` | `/broken-links/*` | EXISTS (Pro) |
| Internal links | `seo.links.internal.*` | `/internal-links/*` | EXISTS (Pro) |
| Local SEO | `seo.local.*` | `/locations/*` | EXISTS (Pro) |
| WooCommerce SEO | `seo.woocommerce.*` | `/woocommerce/settings` | EXISTS (Pro) |
| Settings | `seo.settings.*` | `/settings` | EXISTS |

### 3.4 Publishing & schedule (SchedulePress adapter)

| RankPublish UI | Capability ID | Engine REST | Status |
|----------------|---------------|-------------|--------|
| Calendar | `publishing.calendar.*` | `wpscp/v1` calendar routes | EXISTS |
| Scheduler settings | `publishing.settings.*` | `get-option-data` | EXISTS |
| Post schedule | `publishing.post.*` | `post-panel/{id}` | EXISTS |
| Publish now | `publishing.publish_now` | `update-settings/{id}` | EXISTS |
| Social accounts | `social.profiles.*` | Settings API + AJAX | EXISTS |
| Social templates | `social.templates.*` | `custom-templates/{id}` | EXISTS |
| Schedule social share | `social.share.scheduled` | Post panel + cron | EXISTS |
| Instant share | `social.share.instant` | `instant-social-share` | EXISTS |
| AI captions | `social.ai.caption` | `ai-caption/{id}` | EXISTS |
| Advanced schedule | `publishing.advanced.*` | Pro advanced-schedule | EXISTS (Pro) |
| Unpublish / republish | `publishing.lifecycle.*` | Pro pro-settings | EXISTS (Pro) |
| Missed schedule | `publishing.missed.*` | Pro cron | EXISTS (Pro) |
| Elementor schedule | `publishing.elementor.*` | Pro Elementor module | EXISTS (Pro) |

### 3.5 Nashir overlap (to deprecate for RankPublish sites)

| Nashir feature | Nashir REST | SchedulePress equivalent | Action |
|----------------|-------------|--------------------------|--------|
| Schedule post | `nashir/v1/schedule` | PostPanel | Deprecate on RankPublish sites |
| Publish | `nashir/v1/publish` | PostPanel + WP | Deprecate |
| Unpublish/republish | `nashir/v1/unpublish` | Pro settings | Deprecate |
| Advanced update | `nashir/v1/advanced` | Pro content update | Deprecate |
| Social share | Nashir Social + Prisma | SP social stack | Deprecate |
| Post list sync | `nashir/v1/posts` | Calendar + enriched list | Replace with connector |

---

## 4. Capability discovery mapping

ThinkRank native capability groups → RankPublish UI sections:

| ThinkRank capability slug | RankPublish section |
|---------------------------|---------------------|
| `thinkrank_access` | Base site access |
| `thinkrank_site_identity` | SEO → Identity |
| `thinkrank_analytics` | Analytics |
| `thinkrank_performance` | SEO → Performance |
| `thinkrank_global_seo` | SEO → Bulk |
| `thinkrank_image_seo` | SEO → Images |
| `thinkrank_schema` | SEO → Schema |
| `thinkrank_social_media` | SEO → Social Meta |
| `thinkrank_crawling` | SEO → Crawling |
| `thinkrank_instant_indexing` | SEO → Indexing |
| `thinkrank_author_archives` | SEO → Authors |
| `thinkrank_content_tools` | AI |
| `thinkrank_internal_links` | SEO → Links |
| `thinkrank_settings` | Settings |

SchedulePress has no native capability API — connector must synthesize:

| Synthesized capability | Detection rule |
|------------------------|----------------|
| `publishing.calendar` | `WPSP_VERSION` defined + module loaded |
| `publishing.scheduler` | same |
| `social.profiles` | Social module classes loaded |
| `publishing.advanced` | `WPSP_PRO_VERSION` + Pro loaded |

---

## 5. Action catalog (initial MVP set)

| Action ID | Integration | Engine call | MVP milestone |
|-----------|-------------|-------------|-----------------|
| `site.health` | core | Connector self-check | M2 |
| `integrations.discover` | core | Adapter registry scan | M2 |
| `posts.list` | core | WP_Query | M3 |
| `posts.get` | core + TR + SP | WP + enrich | M5 |
| `seo.post.read` | thinkrank | GET metadata | M3 |
| `seo.post.write` | thinkrank | POST metadata | M3 |
| `seo.settings.read` | thinkrank | GET settings | M3 |
| `seo.settings.write` | thinkrank | POST settings | M3 |
| `publishing.post.read` | schedulepress | GET post-panel | M4 |
| `publishing.post.write` | schedulepress | POST post-panel | M4 |
| `social.profiles.list` | schedulepress | Settings API | M4 |
| `publishing.calendar.list` | schedulepress | wpscp/v1/posts | M4 |

---

## 6. Data flow boundaries

| Data type | Lives on | SaaS stores |
|-----------|----------|-------------|
| Post content | WP | Title/status cache only |
| SEO metadata | ThinkRank tables/meta | No |
| Social OAuth tokens | WP options | No |
| Schedule config | WP post meta / SP options | No |
| User accounts | SaaS DB | Yes |
| Subscriptions | SaaS DB | Yes |
| Action logs | SaaS DB | Yes |
| AI API keys (ThinkRank) | WP options (encrypted) | No |

---

## 7. Error mapping

| Engine error | RankPublish user message |
|--------------|-------------------------|
| `rest_forbidden` | Permission denied — reconnect or check site role |
| `rest_no_route` | Feature unavailable — update plugin |
| OAuth token expired (SP) | Reconnect {platform} in Social settings |
| `thinkrank_forbidden` | SEO access denied for this user |
| Integration version mismatch | Update RankPublish on your site |
| Subscription expired | Renew RankPublish subscription |
| Site offline / timeout | Cannot reach your site — check connection |

---

## 8. Test site matrix

| Site | Plugins active | Purpose |
|------|----------------|---------|
| `rankpublish.local` | Dev stack: upstream + rankpublish-site | Merge development |
| `rankpublish-test.local` | rankpublish 0.8.0 only | Product QA |
| Staging `nashir.satest.top` | rankpublish experimental | Pre-production |

QA script: `deploy/local/qa-rankpublish.cjs`  
Report: `deploy/local/reports/qa-rankpublish-test-2026-08-17.json`

---

## 9. Future integrations (placeholder pattern)

```
New Plugin X
  → modules/plugin-x/   OR standalone detection
  → RankPublish\Integrations\PluginX\Adapter
  → capabilities.json manifest
  → SaaS registry entry
  → UI sections auto-appear
```

No changes to core action router contract.

---

## 10. Review checklist (before Phase 1 coding)

- [ ] Product owner selects SaaS evolution path (Nashir vs greenfield)
- [ ] Product owner selects connector placement (merged plugin recommended)
- [ ] Legal review of Pro features in SaaS context
- [ ] Confirm MVP action list (section 5) is sufficient for first real user
- [ ] Resolve WP REST auth strategy for server-to-server adapter calls
- [ ] Align trial days (7 vs 14)
