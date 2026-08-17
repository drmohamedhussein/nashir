# ThinkRank — Capability Map

**Source audited:** Embedded copy in RankPublish plugin `modules/seo/` + `modules/seo-pro/`  
**Versions:** ThinkRank 1.31.0 (free), ThinkRank Pro 2.0.2  
**Namespace:** `ThinkRank\` (free), `ThinkRank\Pro\` (Pro)  
**REST namespace:** `thinkrank/v1` (free), `thinkrank-pro/v1` (Pro)

All conclusions derived from source under:
`C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/rankpublish/modules/seo/`

---

## 1. Admin interface

### 1.1 Menu pages (`includes/admin/class-manager.php`)

| Page slug | UI title | WP capability | RankPublish SaaS section |
|-----------|----------|---------------|--------------------------|
| `thinkrank` | SEO Dashboard | `thinkrank_access` | SEO → Overview |
| `thinkrank-essential-seo` | Essential SEO | `thinkrank_access` | SEO → Essential |
| `thinkrank-ai-tools` | AI Tools | `thinkrank_content_tools` | AI |
| `thinkrank-usages` | Usages | `thinkrank_analytics` | Analytics |
| `thinkrank-settings` | SEO Settings | `thinkrank_settings` | Settings → SEO |
| `thinkrank-migration` | Migration | `manage_options` | Settings → Migration (conditional) |
| `thinkrank-license` | Account / License | Pro admin | Account (RankPublish stub when embedded) |
| `thinkrank_setup_wizard` | Setup Wizard | onboarding | Onboarding (first-run) |

When `RANKPUBLISH_SEO_EMBEDDED` is defined, pages nest under `rankpublish` parent menu.

### 1.2 Post editor integrations

| Integration | Class | Scope |
|-------------|-------|-------|
| Classic/Gutenberg metabox | `Metabox_Manager` | Per-post SEO fields |
| Elementor | `Elementor_Metabox` | Builder SEO panel |
| Oxygen/Breakdance | `Oxygen_Metabox` | Builder SEO panel |
| Divi | `Divi_Metabox` | Visual builder panel |
| Post list columns | `Post_List_Columns` | SEO score, focus keyword |
| Bulk actions | `Bulk_Action_Manager` | Bulk SEO operations |
| Quick edit modal | `Seo_Quick_Edit_Ajax` | Inline SEO edit |
| Focus keyword AJAX | `Focus_Keyword_Ajax` | Keyword management |

### 1.3 Role capabilities (`includes/core/class-capability-manager.php`)

| Capability slug | Label | SaaS permission group |
|-----------------|-------|----------------------|
| `thinkrank_access` | Access ThinkRank | Base access |
| `thinkrank_site_identity` | Site Identity | SEO → Identity |
| `thinkrank_analytics` | Analytics | Analytics |
| `thinkrank_performance` | Performance | SEO → Performance |
| `thinkrank_global_seo` | Bulk SEO Optimization | SEO → Bulk |
| `thinkrank_image_seo` | Image SEO | SEO → Images |
| `thinkrank_schema` | Schema Manager | SEO → Schema |
| `thinkrank_social_media` | Social Media | SEO → Social Meta |
| `thinkrank_crawling` | Crawling & AI Indexing | SEO → Crawling |
| `thinkrank_instant_indexing` | Instant Indexing | SEO → Indexing |
| `thinkrank_author_archives` | Author Archives | SEO → Authors |
| `thinkrank_content_tools` | AI Tools | AI |
| `thinkrank_internal_links` | Internal Links | SEO → Links (Pro) |
| `thinkrank_settings` | Settings & API Keys | Settings |
| `thinkrank_manage_roles` | Manage Roles | Admin |

Administrators bypass via `manage_options` in `current_user_can()`.

---

## 2. REST API surface (`thinkrank/v1`)

### 2.1 Core / discovery (`includes/api/class-manager.php`)

| Route | Methods | Purpose | Adapter action ID |
|-------|---------|---------|-------------------|
| `/capabilities` | GET | Returns feature flags + plan gates | `discover_capabilities` |
| `/plugin-info` | GET | Version, environment | `get_plugin_info` |
| `/system-status` | GET | Health diagnostics | `get_system_status` |
| `/connection-status` | GET | MCP/integration health | `get_connection_status` |
| `/settings` | GET, POST | Global plugin settings | `get_settings`, `update_settings` |
| `/metadata/(?P<post_id>\d+)` | GET | Post SEO metadata | `get_post_seo` |
| `/metadata/(?P<post_id>\d+)` | POST | **UNKNOWN** — verify in class-manager | `update_post_seo` |

### 2.2 AI endpoints (same manager)

| Route | Purpose |
|-------|---------|
| `/ai/generate-metadata` | Generate title/description |
| `/ai/improve-title` | Improve SEO title |
| `/ai/improve-meta-description` | Improve meta description |
| `/ai/explain-suggestion` | Explain SEO suggestion |
| `/ai/add-dofollow-link` | Insert internal link |
| `/ai/add-keyword-paragraph` | Add keyword paragraph |
| `/ai/test-connection` | Test AI provider |
| `/ai/providers` | List AI providers |
| `/ai/status` | AI service status |
| `/ai/analyze-content` | Content analysis |
| `/schema/enable-for-post` | Enable schema for post |

### 2.3 Dedicated endpoint classes (`includes/api/`)

| Class | Route prefix (under `thinkrank/v1`) | Capability area |
|-------|-------------------------------------|-----------------|
| `Site_Identity_Endpoint` | `/site-identity/*` | Site identity / branding SEO |
| `Performance_Endpoint` | `/performance/*` | Core Web Vitals / PSI |
| `Schema_Endpoint` | `/schema/*` | Schema markup CRUD |
| `Settings_Management_Endpoint` | `/settings-management/*` | Advanced settings groups |
| `Content_Brief_Endpoint` | `/content-brief/*` | Content briefs |
| `Social_Media_Endpoint` | `/social-media/*` | OG/Twitter meta (SEO social) |
| `Sitemap_Endpoint` | `/sitemap/*` | XML sitemap config |
| `SEO_Analytics_Endpoint` | `/seo-analytics/*` | Search analytics |
| `Usage_Analytics_Endpoint` | `/analytics/overview`, `/analytics/usage`, `/analytics/costs` | AI usage |
| `Integrations_Endpoint` | `/integrations/*` | Google OAuth connect/disconnect |
| `Social_Platforms_Endpoint` | social platforms config | Platform list |
| `LLMs_Txt_Endpoint` | `/llms-txt/*` | llms.txt management |
| `Global_SEO_Endpoint` | `/global-seo/*` | Bulk SEO |
| `Image_SEO_Endpoint` | `/image-seo/*` | Image alt/title automation |
| `Instant_Indexing_Endpoint` | `/instant-indexing/*` | IndexNow / Google indexing |
| `Pillar_Content_Endpoint` | pillar content | Content pillars |
| `Global_Robot_Meta_Endpoint` | robots meta | Global robots |
| `Author_Archives_Endpoint` | author archives | Author SEO |
| `Email_Report_Endpoint` | email reports | Scheduled email reports |
| `Setup_Wizard_Endpoint` | `/setup-wizard/*` | Onboarding wizard |
| `SEO_Score_Endpoint` | `/seo-score/*` | Score calculate/get/history |
| `SEO_Analyzer_Endpoint` | `/seo-analyzer`, `/run`, `/fix` | Site-wide analyzer |
| `Focus_Keyword_Usage_Endpoint` | focus keyword usage | Keyword tracking |
| `Brand_Visibility_Endpoint` | brand visibility | AI brand visibility |
| `AI_Insights_Endpoint` | AI insights traffic | Traffic insights |
| `Import_Controller` | `/import/detect`, `/export`, `/migrate`, etc. | SEO plugin importers |

**Note:** Exact sub-paths vary per class. Full route list requires runtime `rest_route` query or automated extraction — marked **PARTIAL** in audit.

### 2.4 MCP server (`includes/mcp/class-mcp-manager.php`)

| Route group | Purpose |
|-------------|---------|
| MCP REST routes (10 registrations) | Model Context Protocol for AI agents |

Auth: WP admin capabilities. **UNKNOWN** whether SaaS connector can proxy without WP user context.

### 2.5 ThinkRank Pro REST (`thinkrank-pro/v1`)

| Endpoint class | Routes | Pro-only feature |
|----------------|--------|------------------|
| `Rank_Tracker_Endpoint` | `/rank-tracker/*` | Keyword rank tracking |
| `Redirections_Endpoint` | `/redirections/*` | Redirects + 404 logs |
| `Broken_Links_Endpoint` | `/broken-links/*` | Broken link scanner |
| `Internal_Links_Endpoint` | `/internal-links/*` | Internal link suggestions |
| `Locations_Endpoint` | `/locations/*` | Local SEO locations |
| `Refresh_Radar_Endpoint` | `/refresh-radar/*` | Content refresh radar |
| `Custom_Schema_Endpoint` | `/custom-schema/*` | Custom schema entries |
| `Sitemaps_Endpoint` | `/publisher-sitemaps/*` | Publisher/video sitemaps |
| `WooCommerce_Endpoint` | `/woocommerce/settings` | WooCommerce SEO |
| `Google_Analytics_Endpoint` | GA data | Analytics integration |
| `Keywords_Endpoint` | `/keywords/*` | GSC keyword data |
| `Top_Content_Endpoint` | `/top-content` | Top performing content |
| `URL_Inspection_Endpoint` | URL inspection | GSC URL inspection |
| `Metadata_Endpoint` | `/metadata/{id}/apply` | Apply AI metadata |
| `Content_Brief_Endpoint` (Pro) | `/content-brief/insert-post` | Create post from brief |
| `Schema_File_Import` | schema file import | File-based schema |

Pro activation detected via filter `thinkrank_is_pro_active` (`class-plan-config.php`).

---

## 3. AJAX handlers (selected)

| Action | Purpose |
|--------|---------|
| `thinkrank_dismiss_notice` | Admin notice dismiss |
| `thinkrank_generate_metadata` | **Referenced in docs** — verify in metabox classes |
| `thinkrank_save_metabox` | Save post SEO from editor |
| `thinkrank_test_api_connection` | Test external API |
| Importer AJAX via `Import_Controller` | Migration workflows |

---

## 4. Data storage

### 4.1 Options prefix: `thinkrank_*`

Examples from code:
- `thinkrank_settings`, `thinkrank_ai_provider`
- `thinkrank_settings_last_updated`, `thinkrank_settings_version`
- `thinkrank_instant_indexing_settings`, `thinkrank_image_seo_settings`
- Encrypted API keys stored per-key as `thinkrank_{key}`

### 4.2 Custom database tables (from uninstall + docs)

| Table | Purpose |
|-------|---------|
| `thinkrank_ai_cache` | AI response cache |
| `thinkrank_ai_usage` | AI usage metering |
| `thinkrank_content_briefs` | Content briefs |
| `thinkrank_seo_scores` | SEO scores history |
| `thinkrank_seo_performance` | Performance metrics |
| `thinkrank_instant_indexing_logs` | Indexing log |
| `thinkrank_seo_settings` | SEO settings store |
| `thinkrank_seo_analysis` | Analysis results |
| `thinkrank_seo_keywords` | Focus keywords |
| `thinkrank_seo_schema` | Schema data |
| `thinkrank_seo_social` | Social meta |
| `thinkrank_seo_local` | Local SEO |
| `thinkrank_email_report_logs` | Email report history |
| `thinkrank_ai_traffic` | AI traffic data |
| Brand visibility tables | Brand visibility runs |
| `thinkrank_rank_tracking` | Rank history |
| `thinkrank_tracked_keywords` | Tracked keywords |
| `thinkrank_redirects` | Redirect rules (Pro) |
| `thinkrank_404_logs` | 404 logs (Pro) |
| `thinkrank_broken_links` | Broken links (Pro) |
| `thinkrank_locations` | Local locations (Pro) |

**RankPublish rule:** SaaS must not write these tables directly — use REST/AJAX through ThinkRank APIs.

### 4.3 Post meta

Post-level SEO stored via ThinkRank metabox/API — exact meta keys **require metabox class audit**. Common pattern: `_thinkrank_*` or registered via Settings API.

**UNKNOWN:** Complete post meta key list — investigate `Metabox_Manager` and `metadata` endpoint handlers in Phase 1.

---

## 5. Cron & background jobs

| Hook / pattern | Purpose |
|----------------|---------|
| `thinkrank_put_do_daily_action` | Usage tracker daily |
| Email report cron | **UNKNOWN schedule** — in Email_Report module |
| Rank tracker refresh | Pro cron via `/rank-tracker/refresh` |
| Instant indexing queue | Instant_Indexing module |

---

## 6. External integrations

| Integration | Mechanism |
|-------------|-----------|
| Google (GSC, GA, PSI) | OAuth via `Integrations_Endpoint` |
| OpenAI, Claude, Gemini, OpenRouter | AI provider settings |
| SEO plugin importers | Yoast, Rank Math, AIOSEO, SEOPress |
| MCP clients | REST MCP server |

---

## 7. Capability matrix for RankPublish adapter

Priority MVP actions (map to existing REST):

| RankPublish capability | ThinkRank feature | REST entry point | Pro? |
|------------------------|-------------------|------------------|------|
| `seo.post.read` | Post SEO metadata | `GET /metadata/{post_id}` | No |
| `seo.post.write` | Update post SEO | POST metadata routes | No |
| `seo.score.read` | SEO score | `GET /seo-score/get` | No |
| `seo.score.calculate` | Calculate score | `POST /seo-score/calculate` | No |
| `seo.schema.read` | Schema config | `Schema_Endpoint` GET routes | Partial Pro |
| `seo.schema.write` | Schema update | `Schema_Endpoint` POST routes | Partial Pro |
| `seo.sitemap.read` | Sitemap settings | `Sitemap_Endpoint` | No |
| `seo.sitemap.write` | Sitemap update | `Sitemap_Endpoint` | No |
| `seo.social_meta.read` | OG/Twitter meta | `Social_Media_Endpoint` | No |
| `seo.social_meta.write` | Update social meta | `Social_Media_Endpoint` | No |
| `seo.settings.read` | Global settings | `GET /settings` | No |
| `seo.settings.write` | Global settings | `POST /settings` | No |
| `seo.ai.generate` | AI metadata | `/ai/generate-metadata` | No |
| `seo.analyzer.run` | Site analyzer | `POST /seo-analyzer/run` | No |
| `seo.integrations.google` | Google connect | `/integrations/google/*` | No |
| `seo.rank_tracker.*` | Rank tracking | `/rank-tracker/*` | **Pro** |
| `seo.redirects.*` | Redirects | `/redirections/*` | **Pro** |
| `seo.broken_links.*` | Broken links | `/broken-links/*` | **Pro** |
| `seo.internal_links.*` | Internal links | `/internal-links/*` | **Pro** |
| `seo.local.*` | Local SEO | `/locations/*` | **Pro** |
| `seo.discover` | Capability discovery | `GET /capabilities` | No |

---

## 8. Authentication model (current)

All REST routes use WordPress authentication:
- Cookie auth (logged-in admin in browser)
- Application passwords / OAuth plugins **may** work — **UNVERIFIED**
- Permission callbacks map routes → `Capability_Manager` caps

**Implication for RankPublish Connector:** Connector must authenticate as a privileged WP user OR implement service account with delegated capabilities. Nashir-style HMAC signing is **not** present in ThinkRank REST today.

---

## 9. Version compatibility

| Component | Version |
|-----------|---------|
| ThinkRank embedded | 1.31.0 (`THINKRANK_VERSION`) |
| ThinkRank Pro embedded | 2.0.2 (`THINKRANK_PRO_VERSION`) |
| RankPublish wrapper | 0.8.0 |
| PHP minimum (Pro) | 8.0 |

---

## 10. UNKNOWN — requires Phase 1 investigation

1. Complete enumeration of all `thinkrank/v1` route paths and HTTP methods
2. Post meta key catalog for SEO fields
3. Whether ThinkRank REST accepts non-cookie auth suitable for server-to-server SaaS
4. Rate limits on AI endpoints
5. Which Pro features are gated at REST vs UI-only
6. MCP server exposure policy for external SaaS

---

## 11. Files of record

| Path | Role |
|------|------|
| `modules/seo/thinkrank.php` (via bootstrap) | Free entry |
| `modules/seo/includes/admin/class-manager.php` | Admin menus |
| `modules/seo/includes/api/class-manager.php` | Core REST |
| `modules/seo/includes/core/class-capability-manager.php` | Capabilities |
| `modules/seo/includes/core/class-plan-config.php` | Pro gating |
| `modules/seo-pro/includes/api/*.php` | Pro REST |
| `rankpublish/docs/AUDIT.md` | Upstream inventory |
