# RankPublish — Security Requirements

**Date:** 2026-08-17  
Derived from product spec + audit of Nashir implementation + engine auth models.

---

## 1. Security principles

1. **Least privilege** — Connector, SaaS, and adapters request minimum permissions.
2. **No secrets in source code** — Environment variables for SaaS; WP options for site credentials.
3. **No direct DB access from SaaS** — Prevents bypass of engine validation/hooks.
4. **Tenant isolation** — User A cannot access User B's sites by ID guessing.
5. **Signed site communication** — All SaaS → WP requests authenticated + replay-protected.
6. **Audit everything mutating** — Action logs for compliance and debugging.
7. **Fail closed** — Missing auth, expired subscription, or invalid signature → reject.

---

## 2. Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Stolen session cookie | HTTPS, HttpOnly cookies, session rotation |
| Stolen signing secret | Secret rotation, site reconnect flow |
| Replay of signed WP requests | Timestamp window (300s), optional nonce |
| Cross-tenant site access | workspaceId check on every query |
| SQL injection | Prisma parameterized queries; WP `$wpdb->prepare()` |
| XSS in SaaS UI | React escaping, CSP headers |
| CSRF on SaaS forms | SameSite cookies + CSRF tokens where needed |
| OAuth token theft (social) | Tokens stay on WP; SaaS never stores SP OAuth secrets |
| Privilege escalation via connector | Action → capability map; no arbitrary REST proxy |
| GPL/commercial license abuse | Legal gate before production (see section 10) |

---

## 3. Authentication & sessions (SaaS)

### 3.1 Current (Nashir)

- Email/password registration with bcrypt hash (`User.passwordHash`)
- Session via `getSession()` in `apps/web/src/lib/auth.ts`
- **UNKNOWN:** Full session cookie flags — verify `middleware.ts` and auth implementation

### 3.2 Required

| Control | Status |
|---------|--------|
| HTTPS only in production | Required (nginx config exists) |
| `AUTH_SECRET` env validation at startup | Required |
| Password minimum strength | **Verify** |
| Rate limit login/register | **MISSING** |
| Account lockout after failed attempts | **MISSING** |
| Optional 2FA | Future |

---

## 4. Site connection security

### 4.1 Pairing flow (existing)

| Control | Implementation | Status |
|---------|----------------|--------|
| Short-lived pairing code | 6 chars, DB expiry | EXISTS |
| Single use | `usedAt` timestamp | EXISTS |
| Code entropy | 36^6 combinations | EXISTS — adequate for 15min window |
| HTTPS for connect endpoint | Deployment responsibility | Required |

### 4.2 Credentials issued on connect

| Secret | Storage (WP) | Storage (SaaS) |
|--------|--------------|----------------|
| `site_id` | `nashir_site_id` option | `Site.id` |
| `api_key` | **NOT stored on WP** (SaaS only) | Hashed: `Site.apiKeyHash` |
| `signing_secret` | `nashir_signing_secret` option | `Site.signingSecret` (encrypted at rest **RECOMMENDED**) |

**Gap:** SaaS stores `signingSecret` in plaintext in DB — **encrypt at application level** before production.

### 4.3 Request signing (existing — reuse)

From `Nashir_Crypto::verify()`:

```php
// Headers: X-Nashir-Timestamp, X-Nashir-Signature
// signature = HMAC-SHA256(secret, timestamp + "." + body)
// Reject if |now - timestamp| > 300
```

Rename to `X-RankPublish-*` in RankPublish connector; support dual headers during migration.

### 4.4 Token rotation

| Event | Action |
|-------|--------|
| User disconnects site | Invalidate signing secret both sides |
| Suspected compromise | Regenerate secret, force reconnect |
| Subscription cancelled | Read-only or block mutating actions |

**Status:** Manual reconnect only today — **automated rotation MISSING**.

---

## 5. Authorization chain

Every mutating SaaS request MUST verify:

```
1. Valid session / API token
2. site.workspaceId === session.workspaceId
3. Subscription live (trial | active | manual) AND currentPeriodEnd > now
4. Site.status === 'connected'
5. Capability enabled for action
6. (Future) User role permission within workspace
```

Prisma queries must always include `workspaceId` filter — never trust client-supplied workspace ID alone.

---

## 6. Connector security

### 6.1 Inbound (from SaaS)

| Control | Requirement |
|---------|-------------|
| HMAC verification | Required on all routes except public health |
| Timestamp validation | 300 second window |
| Constant-time signature compare | Required |
| IP allowlist | Optional (not recommended — SaaS IPs may change) |
| Action allowlist | **Critical** — no open REST proxy to `thinkrank/v1` |

**Anti-pattern to avoid:**
```
// NEVER: forward arbitrary URL from SaaS to wp-json
POST /rankpublish/v1/proxy { "url": "..." }  ← forbidden
```

### 6.2 Outbound (to engines)

ThinkRank and SchedulePress REST use WordPress capability checks:

| Approach | Security | Complexity |
|----------|----------|------------|
| Loopback REST as admin user | Medium — needs credential | Low |
| Direct PHP class calls | Higher — bypass REST auth but controlled | Medium |
| Application Password per connector | Good — auditable WP user | Medium |
| Elevated connector capability | High risk if bug | Low |

**Decision required before Phase 2.** Recommended: dedicated WP user `rankpublish-connector` with custom cap `rankpublish_execute_actions` mapped to required engine caps.

### 6.3 Outbound (to SaaS)

| Control | Status |
|---------|--------|
| HTTPS only | Required |
| Sign responses (optional) | Future — detect MITM |
| Heartbeat without sensitive data | EXISTS |

---

## 7. Input validation

### 7.1 SaaS (Next.js routes)

- Zod schemas on all POST bodies (pattern established in `connect/route.ts`)
- Extend to action dispatch with strict payload schemas per action type

### 7.2 Connector

- Validate `action` against registry enum
- Validate `object_id` is positive integer
- Sanitize all string fields before passing to adapters
- Reject unknown payload keys (strict mode)

### 7.3 Adapters

- Pass through engine's REST validation where possible
- Never construct SQL directly

---

## 8. Output encoding

| Surface | Rule |
|---------|------|
| SaaS React UI | Default JSX escape |
| WordPress admin (connector settings) | `esc_html`, `esc_url`, `esc_attr` |
| API JSON errors | No stack traces in production |
| Activity log user messages | Sanitized, no raw PHP errors |

---

## 9. Sensitive data handling

| Data | Location | SaaS may store? |
|------|----------|-----------------|
| User password | SaaS bcrypt hash | Yes (hash only) |
| WP admin credentials | Never | **NO** |
| Signing secret | WP + SaaS | Yes (encrypt) |
| ThinkRank AI API keys | WP options encrypted | **NO** |
| Social OAuth tokens | WP options | **NO** — status only |
| Google OAuth (ThinkRank) | WP | **NO** |
| Customer post content | WP | Cache excerpt only |
| Billing card data | Payment provider | **NO** in our DB (Stripe etc.) |

---

## 10. Rate limiting

| Endpoint class | Limit | Status |
|----------------|-------|--------|
| Auth endpoints | 10/min/IP | MISSING |
| Connect/pairing | 5/min/IP | MISSING |
| SaaS API general | 120/min/user | MISSING |
| Connector actions | 60/min/site | MISSING |
| AI-powered actions | 10/min/site | MISSING |

Implement at nginx and/or application layer before public launch.

---

## 11. Audit logging

| Event | Log to |
|-------|--------|
| Site connect/disconnect | `ActionLog` + `ActivityEvent` |
| Subscription change | `ActionLog` |
| Every action execution | `ActionLog` with payload hash |
| Failed auth attempts | Security log |
| Capability sync | `SyncState` |

Retention policy: **UNKNOWN** — define before production (suggest 90 days minimum for actions).

---

## 12. WordPress-specific

| Control | Requirement |
|---------|-------------|
| Nonce on WP admin forms | Required for connector settings UI |
| `manage_options` for connector setup | Minimum for pairing UI |
| No `eval`, no unserialize of user input | Standard |
| `$wpdb->prepare()` for any raw SQL | If any added in connector |
| Disable file editing in production WP | Operator responsibility |

---

## 13. Infrastructure

From `deploy/contabo/`:

| Control | Notes |
|---------|-------|
| TLS termination | nginx |
| Postgres not public | Docker/local 5433 |
| `CRON_SECRET` for job tick | EXISTS |
| `DATABASE_URL`, `AUTH_SECRET` in env | Required |
| PM2 process isolation | ecosystem.config.cjs |

---

## 14. Dependency & supply chain

| Item | Action |
|------|--------|
| RankPublish embedded vendors | Keep GPL notices (`docs/LEGAL.md`) |
| npm audit | Run before release |
| Disable WPDeveloper phone-home in embed | Done via RankPublish Branding/Compat |
| Plugin update channel | Must be signed when RankPublish updates ship |

---

## 15. Failure testing (security scenarios)

From product spec — must pass before production:

| Scenario | Expected behavior |
|----------|-------------------|
| Expired pairing code | 400, no credentials issued |
| Reused pairing code | 400 |
| Invalid HMAC signature | 403 from connector |
| Expired timestamp | 403 |
| User A accesses Site B ID | 404 (not 403 — no leak) |
| Subscription expired | 402 on mutating actions |
| Plugin disabled on WP | Capability unavailable error |
| Duplicate idempotency key | Same response, no double publish |

---

## 16. Legal / licensing security

| Risk | Mitigation |
|------|------------|
| GPL source distribution obligations | `docs/LEGAL.md`, `ATTRIBUTION.md` in modules |
| Commercial Pro features in unauthorized SaaS | Legal review before launch |
| WPDeveloper EDD license bypass in embed | Intentional for merged product — document rationale |

**Production launch blocked until legal sign-off.**

---

## 17. Security checklist by phase

### Phase 2 (Connector MVP)
- [ ] HMAC on all connector routes
- [ ] Action allowlist registry
- [ ] No open proxy
- [ ] Dedicated WP service user OR documented auth approach

### Phase 3–4 (Adapters)
- [ ] Per-action payload validation
- [ ] Engine errors sanitized

### Phase 6 (Billing)
- [ ] Subscription gate on all mutating routes
- [ ] Signing secret encryption at rest

### Phase 8 (Production)
- [ ] Rate limiting
- [ ] Security headers (CSP, HSTS)
- [ ] Penetration test on connect + action flows
- [ ] Secret rotation procedure documented

---

## 18. References

| File | Relevance |
|------|-----------|
| `apps/plugin/includes/class-crypto.php` | HMAC implementation |
| `apps/plugin/includes/class-rest.php` | Inbound auth pattern |
| `apps/web/src/lib/crypto.ts` | SaaS signing |
| `modules/seo/includes/core/class-security-headers.php` | ThinkRank admin CSP |
| `rankpublish/docs/LEGAL.md` | GPL compliance |
