# SchedulePress — Capability Map

**Source audited:** Embedded copy in RankPublish plugin `modules/schedule/` + `modules/schedule-pro/`  
**Versions:** SchedulePress 5.3.3 (free), SchedulePress Pro 5.3.2  
**Namespace:** `WPSP\` (free), `WPSP_PRO\` (Pro)  
**REST namespaces:** `wp-scheduled-posts/v1`, `wpscp/v1`

All conclusions derived from source under:
`C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/rankpublish/modules/schedule/`

---

## 1. Admin interface

### 1.1 Menu pages (`includes/Admin/Menu.php`)

| Page slug | UI title (embedded) | Capability | RankPublish SaaS section |
|-----------|---------------------|------------|--------------------------|
| `schedulepress` | Scheduler | `manage_options` | Schedule → Scheduler |
| `schedulepress-calendar` | Calendar | `manage_options` | Schedule → Calendar |
| `schedulepress-{post_type}` | Calendar (per CPT) | `edit_posts` | Schedule → Calendar (filtered) |

When `RANKPUBLISH_SCHEDULE_EMBEDDED` is defined, pages nest under `rankpublish` parent.

UI is React SPA mounted in `#wpsp-dashboard-body` — no server-rendered settings HTML.

### 1.2 Post editor integration

| Feature | Location |
|---------|----------|
| Post panel (schedule + social per post) | REST `PostPanel` + Gutenberg/classic metaboxes |
| Calendar drag-drop | Calendar REST + admin JS |
| Social profiles | Social module + settings API |
| Email notifications | Settings |
| Admin bar shortcuts | Admin module |
| Dashboard widget | Dashboard widget class |

### 1.3 Pro-only admin features (`modules/schedule-pro/`)

| Feature | Module |
|---------|--------|
| Advanced auto-schedule | `AdvancedSchedule/` |
| Missed schedule recovery | `Scheduled/Missed` |
| Unpublish / republish / republish-share | `Scheduled/` cron handlers |
| Elementor scheduled updates | `Scheduled/PublishedElementor` |
| Classic editor advanced schedule | `Scheduled/Classic_Editor` |
| Pro settings per post | `API/Settings.php` |

---

## 2. REST API surface

### 2.1 Post panel (`includes/API/PostPanel.php`)

**Namespace:** `wp-scheduled-posts/v1`

| Route | Methods | Purpose | Adapter action |
|-------|---------|---------|----------------|
| `/post-panel/(?P<post_id>\d+)` | GET | Read post schedule + social settings | `schedule.post.read` |
| `/post-panel/(?P<post_id>\d+)` | POST | Save schedule date, is_scheduled | `schedule.post.write` |
| `/update-settings/(?P<post_id>\d+)` | POST | Publish future post immediately | `schedule.publish_now` |

Permission: `current_user_can('edit_post', $post_id)`

Hook after save: `schedulepress_after_free_settings_save` — Pro extends via this hook.

### 2.2 Calendar (`includes/Admin/Calendar.php`)

**Namespace:** `wpscp/v1`

| Route | Purpose |
|-------|---------|
| Calendar event routes (multiple registrations) | CRUD calendar events |
| `/posts` | List posts for calendar view |
| Additional calendar endpoints | Drag-drop updates, filters |

Exact route paths: **PARTIAL** — multiple `register_rest_route` calls in Calendar.php lines 99–165.

### 2.3 Settings API (`includes/API/Settings.php`)

**Namespace:** `wpscp/v1` (via `$namespace` variable)

| Route | Purpose |
|-------|---------|
| `get-option-data` | Read plugin options |
| `instant-social-share` | Trigger instant share |
| `get-categories` | Category list for scheduling |
| `update-refresh-token` | OAuth token refresh |
| Social profile routes (dynamic `$endpoint`) | Profile CRUD |
| `fetch_pinterest_section` | Pinterest board sections |
| `/save-profile` | Save social profile |

### 2.4 Custom social templates (`includes/API/CustomSocialTemplates.php`)

| Route | Purpose |
|-------|---------|
| `custom-templates/(?P<post_id>\d+)` | GET/POST/DELETE per-post templates |
| `social-settings/(?P<post_id>\d+)` | Per-post social settings |

### 2.5 AI captions (`includes/API/AICaption.php`)

| Route | Purpose |
|-------|---------|
| `ai-caption/(?P<post_id>\d+)` | Generate AI social caption |
| `ai-test-key` | Test AI API key |

### 2.6 SchedulePress Pro REST

**Namespace:** `wp-scheduled-posts/v1` (shared with free)

| Route | Purpose | Adapter action |
|-------|---------|----------------|
| `/pro-settings/(?P<post_id>\d+)` | GET/POST Pro post settings | `schedule.pro_settings.*` |
| `update-post-content` | Scheduled content update | `schedule.advanced_content` |
| `advanced-schedule` | Advanced scheduling rules | `schedule.advanced.read` |
| `update-advanced-schedule` | Update advanced rules | `schedule.advanced.write` |

Source: `modules/schedule-pro/includes/API/Settings.php`, `AdvancedSchedule/AdvancedSchedule.php`

---

## 3. AJAX handlers (selected)

| Action | Class | Purpose |
|--------|-------|---------|
| `wpsp_el_editor_form` | `Admin.php` | Elementor editor tab |
| `wpsp_social_add_social_profile` | `Social/SocialProfile.php` | Add social profile |
| `wpsp_social_profile_fetch_user_info_and_token` | SocialProfile | OAuth token exchange |
| `wpsp_social_profile_fetch_pinterest_section` | SocialProfile | Pinterest sections |
| `wpscp_instant_share_fetch_profile` | `Social/InstantShare.php` | Instant share UI |
| `wpscp_instant_social_single_profile_share` | InstantShare | Execute instant share |
| WPDeveloper notice/opt-in AJAX | Admin/WPDev/* | **Suppressed in RankPublish embed** |

Legacy (commented out in Calendar.php):
- `wpscp_calender_ajax_request`
- `wpscp_delete_event`

Calendar now uses REST instead.

---

## 4. Social publishing

### 4.1 Supported networks (from cron/hook inventory in AUDIT.md)

Facebook, Twitter/X, LinkedIn, Pinterest, Instagram, Threads, Medium, Mastodon, Bluesky, Google Business

### 4.2 OAuth flow

- Uses SchedulePress API middleware (external URLs in SP constants)
- Token refresh cron: `wpsp_google_business_token_refresh`
- Profiles stored in WP options — **exact option keys: `wpsp_*` / `wpscp_*`**

### 4.3 Social vs ThinkRank social

| Layer | Plugin | Purpose |
|-------|--------|---------|
| **Publishing** | SchedulePress | Post to social networks |
| **SEO meta** | ThinkRank | OG/Twitter meta tags |

RankPublish SaaS must label these separately in UI (Social vs SEO Social Meta).

---

## 5. Cron & background jobs

### 5.1 Free module

| Pattern | Purpose |
|---------|---------|
| Social publish hooks per network | Publish on schedule |
| `wpsp_google_business_token_refresh` | Token refresh |
| Usage tracker daily event | WPDeveloper analytics (suppressed in embed) |

### 5.2 Pro module

| Hook | Purpose |
|------|---------|
| `wpscp_pro_schedule_unpublish` | Scheduled unpublish |
| `wpscp_pro_schedule_republish` | Scheduled republish |
| `wpscp_pro_schedule_republish_share` | Republish + social share |
| `wpscp_pending_schedule` | Pending schedule processor |
| `wpscp_el_pending_schedule` | Elementor pending |
| `wpscp_pro_classic_advanced_schedule` | Classic advanced schedule |
| Advanced schedule `CRON_HOOK` | Auto-schedule engine |
| Elementor cache clear hook | After Elementor publish |
| Weekly license cron | **Disabled in RankPublish embed** |

---

## 6. Data storage

### 6.1 Options

| Prefix | Examples |
|--------|----------|
| `wpsp_*` | `wpsp_settings`, `wpsp_settings_v5` |
| `wpscp_*` | Legacy settings |

RankPublish merge policy: **reuse existing keys** — no migration copy required (`docs/ARCHITECTURE.md` Phase 8).

### 6.2 Post meta

SchedulePress stores per-post schedule and social config — accessed via PostPanel REST.

**UNKNOWN:** Complete post meta key list — investigate PostPanel `get_settings` / `save_settings` implementations.

### 6.3 Database tables

SchedulePress primarily uses WP posts (`future` status) + options. Pro advanced schedule may use custom tables — **verify in Pro Installer**.

---

## 7. Free ↔ Pro coupling

| Rule | Implementation |
|------|----------------|
| Pro requires free | Basename check in Pro bootstrap |
| Pro never auto-installs free when embedded | `RANKPUBLISH_SCHEDULE_EMBEDDED` guard |
| Extension hooks | `wpsp_el_*`, `wpsp_pro_update_post`, `wpsp_publish_future_post` |
| License | WPDeveloper EDD — **disabled in RankPublish embed** |

---

## 8. Capability matrix for RankPublish adapter

| RankPublish capability | SchedulePress feature | REST / mechanism | Pro? |
|------------------------|----------------------|------------------|------|
| `publishing.calendar.read` | Calendar posts | `GET wpscp/v1/posts` | No |
| `publishing.calendar.write` | Move/reschedule | Calendar REST POST | No |
| `publishing.post.read` | Post schedule settings | `GET wp-scheduled-posts/v1/post-panel/{id}` | No |
| `publishing.post.write` | Update schedule | `POST post-panel/{id}` | No |
| `publishing.publish_now` | Publish future now | `POST update-settings/{id}` | No |
| `social.profiles.read` | Social profiles | Settings API GET | No |
| `social.profiles.write` | Add/update profile | Settings API + AJAX | No |
| `social.templates.read` | Custom templates | `GET custom-templates/{id}` | No |
| `social.templates.write` | Save templates | POST custom-templates | No |
| `social.share.instant` | Instant share | `instant-social-share` + AJAX | No |
| `social.share.scheduled` | On-publish share | Cron + post panel | No |
| `social.ai.caption` | AI caption | `ai-caption/{id}` | No |
| `publishing.advanced.read` | Advanced rules | `GET advanced-schedule` | **Pro** |
| `publishing.advanced.write` | Update rules | `POST update-advanced-schedule` | **Pro** |
| `publishing.pro_settings.*` | Unpublish/republish | `/pro-settings/{id}` | **Pro** |
| `publishing.content_update` | Scheduled content | `update-post-content` | **Pro** |
| `publishing.settings.read` | Global options | `get-option-data` | No |

---

## 9. Authentication model (current)

- REST routes use WordPress capability checks (`edit_post`, `manage_options`)
- No HMAC / API key layer native to SchedulePress
- OAuth tokens for social networks stored encrypted in options

**Implication:** RankPublish Connector must bridge SaaS signed requests → WP REST with appropriate auth context (same gap as ThinkRank).

---

## 10. Overlap with Nashir plugin (PublisherWP)

The Nashir connector (`apps/plugin`) implements its **own** scheduling REST (`nashir/v1`) with overlapping features:

| Feature | Nashir | SchedulePress |
|---------|--------|---------------|
| Schedule post | ✓ `/schedule` | ✓ PostPanel |
| Publish/unpublish | ✓ | ✓ Pro |
| Republish | ✓ meta-based | ✓ Pro cron |
| Advanced content update | ✓ `_nashir_advanced_at` | ✓ Pro Elementor/classic |
| Social publishing | Simplified | Full multi-network |
| Calendar UI | Basic | Full React calendar |

**These are parallel implementations.** RankPublish adapter must use SchedulePress, not Nashir REST, for customer sites running merged plugin.

---

## 11. Version compatibility

| Component | Version |
|-----------|---------|
| SchedulePress embedded | 5.3.3 (`WPSP_VERSION`) |
| SchedulePress Pro embedded | 5.3.2 (`WPSP_PRO_VERSION`) |
| RankPublish wrapper | 0.8.0 |
| Settings slug | `schedulepress` (`WPSP_SETTINGS_SLUG`) |

---

## 12. UNKNOWN — requires Phase 1 investigation

1. Complete `wpscp/v1` route catalog from Calendar.php and Settings.php
2. Post meta keys used by PostPanel
3. Social profile option schema for adapter serialization
4. Pro advanced schedule data model (options vs custom tables)
5. External OAuth middleware URL stability for SaaS documentation
6. Whether instant share can be triggered server-side without browser OAuth session

---

## 13. Files of record

| Path | Role |
|------|------|
| `modules/schedule/wp-scheduled-posts.php` | Free bootstrap |
| `modules/schedule/includes/Admin/Menu.php` | Menus |
| `modules/schedule/includes/API/PostPanel.php` | Post REST |
| `modules/schedule/includes/API/Settings.php` | Settings REST |
| `modules/schedule/includes/Admin/Calendar.php` | Calendar REST |
| `modules/schedule/includes/Social/*` | Social OAuth + share |
| `modules/schedule-pro/includes/API/Settings.php` | Pro REST |
| `modules/schedule-pro/includes/AdvancedSchedule/` | Advanced scheduling |
| `rankpublish/docs/AUDIT.md` | Upstream inventory |
