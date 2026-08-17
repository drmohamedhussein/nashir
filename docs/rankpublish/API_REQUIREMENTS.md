# RankPublish — API Requirements

**Date:** 2026-08-17  
Defines API contracts for SaaS ↔ Connector ↔ Adapters.  
**Baseline:** Nashir `/api/v1/*` (exists) + proposed `rankpublish/v1` (missing).

---

## 1. API layers

| Layer | Base URL | Auth | Status |
|-------|----------|------|--------|
| RankPublish SaaS | `https://rankpublish.com/api/v1` | Session cookie / future API token | PARTIAL (Nashir) |
| RankPublish Connector | `{site}/wp-json/rankpublish/v1` | HMAC signed (from SaaS) | **NOT BUILT** |
| ThinkRank engine | `{site}/wp-json/thinkrank/v1` | WP capabilities | EXISTS |
| ThinkRank Pro | `{site}/wp-json/thinkrank-pro/v1` | WP capabilities | EXISTS |
| SchedulePress | `{site}/wp-json/wp-scheduled-posts/v1` | WP capabilities | EXISTS |
| SchedulePress calendar | `{site}/wp-json/wpscp/v1` | WP capabilities | EXISTS |
| Nashir legacy | `{site}/wp-json/nashir/v1` | HMAC signed | EXISTS (deprecate) |

---

## 2. SaaS API — existing (Nashir)

### 2.1 Authentication

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/auth/register` | POST | Public | `{ name, email, password }` | Session |
| `/api/auth/login` | POST | Public | `{ email, password }` | Session |
| `/api/auth/logout` | POST | Session | — | `{ ok }` |

### 2.2 Site connection

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/v1/pairing` | POST | Session | — | `{ code, expires_at }` |
| `/api/v1/connect` | POST | Public | `{ code, site_url, site_name, rest_url, wp_version? }` | `{ site_id, api_key, signing_secret, plan }` |
| `/api/v1/license/activate` | POST | Public | `{ email, password, site_url, site_name, rest_url, wp_version? }` | Same as connect |

**Gap vs spec:** Response lacks `integrations[]`, `capabilities[]`.

### 2.3 Sites

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/v1/sites/[siteId]` | GET/PATCH/DELETE | Session | PATCH: settings fields | Site object |
| `/api/v1/sites/[siteId]/sync` | POST | Session | — | `{ posts: [...] }` |
| `/api/v1/sites/[siteId]/heartbeat` | POST | Signed (WP) | `{ version?, licensed? }` | `{ ok }` |
| `/api/v1/sites/[siteId]/settings` | PATCH | Session | scheduler settings | `{ ok }` |

### 2.4 Posts & actions (Nashir-native — to evolve)

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/v1/posts/[postId]/action` | POST | Session | `{ action, datetime? }` | `{ ok }` |
| `/api/v1/posts/[postId]/publish` | POST | Session | — | `{ ok }` |

Actions enum today: `publish | unpublish | republish | schedule | advanced | publish_keep_date`

**Required change:** Generic action envelope (section 3).

### 2.5 Social (simplified — to replace with SP adapter)

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/v1/social` | GET/POST | Session | Prisma SocialAccount — not SP OAuth |

### 2.6 Billing

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/api/v1/billing` | GET/POST | Session | Subscription + plan info |
| `/api/v1/subscriptions/[id]/unbind` | POST | Session | `{ ok }` |

### 2.7 Cron

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/cron/tick` | POST | `CRON_SECRET` header | Process ScheduleJob queue |

---

## 3. SaaS API — required (new)

### 3.1 Response envelope (all endpoints)

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Nashir today returns ad-hoc shapes — migrate incrementally.

### 3.2 Integrations & capabilities

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/sites/{id}/integrations` | GET | List installed integrations + versions |
| `GET /api/v1/sites/{id}/capabilities` | GET | Merged capability snapshot |
| `POST /api/v1/sites/{id}/capabilities/sync` | POST | Trigger rediscovery |

**Response example:**

```json
{
  "ok": true,
  "data": {
    "integrations": [
      { "id": "thinkrank", "version": "1.31.0", "status": "active" },
      { "id": "schedulepress", "version": "5.3.3", "status": "active" }
    ],
    "capabilities": [
      { "id": "seo.post.read", "integration": "thinkrank", "label": "Read post SEO" },
      { "id": "publishing.calendar.read", "integration": "schedulepress", "label": "Calendar" }
    ]
  }
}
```

### 3.3 Unified action dispatch

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/v1/sites/{id}/actions` | POST | Execute any capability action |
| `GET /api/v1/sites/{id}/actions/{actionLogId}` | GET | Poll async action status |

**Request:**

```json
{
  "action": "seo.post.write",
  "object_type": "post",
  "object_id": "123",
  "payload": {
    "title": "Updated SEO title",
    "description": "Meta description"
  },
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "async": false
}
```

**Response (sync):**

```json
{
  "ok": true,
  "data": {
    "action_log_id": "clxyz...",
    "status": "completed",
    "result": { "post_id": 123, "seo": { "title": "..." } }
  }
}
```

**Response (async):**

```json
{
  "ok": true,
  "data": {
    "action_log_id": "clxyz...",
    "status": "queued",
    "job_id": "cljob..."
  }
}
```

### 3.4 Posts (unified DTO)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/sites/{id}/posts` | GET | List with pagination + filters |
| `GET /api/v1/sites/{id}/posts/{wpPostId}` | GET | Full post workspace data |

**Post DTO (target):**

```json
{
  "wp_post_id": 123,
  "title": "...",
  "status": "draft",
  "post_type": "post",
  "permalink": "https://...",
  "content": { "excerpt": "..." },
  "schedule": { "scheduled_at": null, "is_scheduled": false },
  "seo": { "title": "", "description": "", "focus_keyword": "", "score": 72 },
  "social": { "profiles": [], "templates": {} },
  "capabilities": ["seo.post.write", "publishing.post.write"]
}
```

Fields populated only when integration active.

### 3.5 Activity

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/activity` | GET | Workspace activity feed |
| `GET /api/v1/sites/{id}/activity` | GET | Site-scoped activity |

---

## 4. Connector API — required (new)

**Namespace:** `rankpublish/v1`  
**Auth:** HMAC-SHA256 (reuse Nashir algorithm)

### 4.1 Headers

| Header | Description |
|--------|-------------|
| `X-RankPublish-Timestamp` | Unix seconds |
| `X-RankPublish-Signature` | HMAC of `{timestamp}.{body}` |
| `Content-Type` | `application/json` |

Support legacy `X-Nashir-*` during migration **optional**.

### 4.2 Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Connector + module health |
| `/integrations` | GET | Integration discovery |
| `/capabilities` | GET | Full capability manifest |
| `/actions` | POST | Execute action (mirror SaaS) |
| `/actions/{id}` | GET | Action status (async) |
| `/posts` | GET | List posts (paginated) |
| `/posts/{id}` | GET | Unified post DTO |

### 4.3 Health response

```json
{
  "ok": true,
  "connector_version": "1.0.0",
  "rankpublish_version": "0.8.0",
  "wordpress_version": "6.8.0",
  "integrations": [
    { "id": "thinkrank", "version": "1.31.0", "loaded": true },
    { "id": "schedulepress", "version": "5.3.3", "loaded": true }
  ],
  "connected": true,
  "site_url": "https://example.com"
}
```

### 4.4 Action router contract

```php
interface ActionHandler {
    public function id(): string;
    public function required_capability(): string;
    public function handle( ActionRequest $request ): ActionResult;
}
```

Registry maps `action` string → handler. Handler calls adapter.

### 4.5 Internal adapter calls

Connector does **not** expose engine REST publicly to SaaS. SaaS only talks to `rankpublish/v1`.

Internal flow:
```
rankpublish/v1/actions → ThinkRankAdapter → wp_remote_request(local thinkrank/v1/...)
```

Use loopback REST or direct PHP if same process (preferred for performance — **requires engineering decision**).

---

## 5. Signing algorithm (existing — reuse)

From `Nashir_Crypto` / `apps/web/src/lib/crypto.ts`:

```
signature = HMAC-SHA256(signing_secret, timestamp + "." + raw_body)
```

Validation:
- Reject if `|now - timestamp| > 300` seconds
- Constant-time compare signature

---

## 6. Idempotency

| Field | Location | Rule |
|-------|----------|------|
| `idempotency_key` | SaaS request | UUID v4, required for mutating actions |
| `action_log_id` | SaaS DB | Unique per attempt |
| Storage | `ActionLog` table | Unique index on `(siteId, idempotency_key)` |

Duplicate request with same key → return original result, do not re-execute.

---

## 7. Rate limiting (required)

| Layer | Limit | Scope |
|-------|-------|-------|
| SaaS public | 10/min | login, register, connect |
| SaaS authenticated | 120/min | per user |
| Connector | 60/min | per site signing secret |
| AI actions | 10/min | per site (configurable) |

Nashir: **NOT IMPLEMENTED** today.

---

## 8. Webhooks (future)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `post.updated` | WP → SaaS | Invalidate cache |
| `action.completed` | Connector → SaaS | Async completion |
| `integration.degraded` | Connector → SaaS | Version mismatch alert |

Nashir partial: `Nashir_Sync` pushes on `save_post` — extend for RankPublish events.

---

## 9. Version headers

| Header | Set by | Purpose |
|--------|--------|---------|
| `X-RankPublish-Api-Version` | SaaS | API contract version (`1`) |
| `X-RankPublish-Connector-Version` | Connector | Connector semver |
| `X-RankPublish-Min-Connector` | SaaS | Reject old connectors |

---

## 10. Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AUTH_REQUIRED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | No workspace/site access |
| `SUBSCRIPTION_INACTIVE` | 402 | Trial/subscription expired |
| `SITE_UNREACHABLE` | 502 | Cannot reach WP |
| `CAPABILITY_UNAVAILABLE` | 422 | Integration missing |
| `ACTION_FAILED` | 502 | Engine returned error |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key, different payload |
| `VERSION_MISMATCH` | 426 | Connector/plugin too old |
| `VALIDATION_ERROR` | 400 | Bad request |

---

## 11. Migration from Nashir API

| Phase | Behavior |
|-------|----------|
| 1 | Add `rankpublish/v1` alongside `nashir/v1` |
| 2 | SaaS uses rankpublish actions for SEO/SP; nashir for legacy sites |
| 3 | Deprecate `nashir/v1` post endpoints |
| 4 | Remove `nashir/v1` |

Feature flag: `site.connectorType = 'nashir' | 'rankpublish'`

---

## 12. Open API questions

1. **Direct PHP vs loopback REST** for adapter → engine calls
2. **Application Password** vs **connector internal bypass** for engine REST auth
3. **Pagination** cursor format for large post lists
4. **Webhook** delivery vs poll-only for MVP
5. **OpenAPI** spec generation — recommended for Phase 1

---

## 13. Reference: ThinkRank discovery endpoint

Existing engine API useful for adapter bootstrap:

```
GET /wp-json/thinkrank/v1/capabilities
GET /wp-json/thinkrank/v1/plugin-info
GET /wp-json/thinkrank/v1/system-status
```

SchedulePress: **no equivalent** — connector synthesizes from constants + class existence.
