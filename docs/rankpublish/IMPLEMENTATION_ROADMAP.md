# RankPublish — Implementation Roadmap

**Date:** 2026-08-17  
**Prerequisite:** Phase 0 audit complete — review this document before any coding.

---

## Phase overview

| Phase | Name | Deliverable | Gate to proceed |
|-------|------|-------------|-----------------|
| 0 | Audit | 8 docs in `docs/rankpublish/` | **Product owner review** ← YOU ARE HERE |
| 1 | Architecture sign-off | ADRs, auth decision, monorepo plan | Written approval |
| 2 | Connector core | `rankpublish/v1` health, handshake, discovery | QA on test site |
| 3 | ThinkRank adapter (MVP) | seo.post read/write, settings | WP verify |
| 4 | SchedulePress adapter (MVP) | post-panel, calendar list | WP verify |
| 5 | SaaS evolution | Actions API, capability nav, post workspace | End-to-end test |
| 6 | Billing alignment | 7-day trial, access control | Subscription tests |
| 7 | Observability | Activity log, error UX | Failure test suite |
| 8 | Hardening & production | Security checklist, deploy | Launch criteria |

**Rule:** Do not start Phase N+1 until Phase N gate passes.

---

## Phase 0 — Audit ✅

**Output:**
- [PLUGIN_AUDIT.md](./PLUGIN_AUDIT.md)
- [THINKRANK_CAPABILITIES.md](./THINKRANK_CAPABILITIES.md)
- [SCHEDULEPRESS_CAPABILITIES.md](./SCHEDULEPRESS_CAPABILITIES.md)
- [RANKPUBLISH_ARCHITECTURE.md](./RANKPUBLISH_ARCHITECTURE.md)
- [INTEGRATION_MAP.md](./INTEGRATION_MAP.md)
- [API_REQUIREMENTS.md](./API_REQUIREMENTS.md)
- [SECURITY_REQUIREMENTS.md](./SECURITY_REQUIREMENTS.md)
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)

**Owner action:** Review capability maps and architecture decisions (section below).

---

## Phase 1 — Architecture sign-off

### Locked (2026-08-17)
- [x] RankPublish merged plugin 0.8.0 as engine host
- [x] Evolve Nashir web (`apps/web`) — not greenfield
- [x] Connector inside merged plugin — not separate
- [x] Adapter auth: **internal REST + service user** (not Application Password)
- [x] Dev environments: LocalWP + `nashir.satest.top` staging
- [x] Internal GPL reuse — not commercial launch yet

### Remaining before Phase 2 code
- [ ] Confirm MVP action list (INTEGRATION_MAP section 5)
- [ ] Complete UNKNOWN items: REST route script, post meta catalog
- [ ] Trial days: defer until Milestone 6 (default 7)

### Exit criteria
- [x] Architecture decisions recorded in RANKPUBLISH_ARCHITECTURE.md §12
- [x] Connector `rankpublish/v1` on plugin 0.9.0 (LocalWP)
- [ ] Product owner confirms MVP action list
- [ ] End-to-end connect test (LocalWP + SaaS)

---

## Milestone 1 — SaaS foundation (maps to spec M1)

**Scope:** Auth, dashboard shell, my websites, site connection

| Task | Source reuse | Work |
|------|--------------|------|
| Rebrand PublisherWP → RankPublish | `apps/web` | UI strings, logos |
| Pairing flow | EXISTS | Minor rebrand |
| My websites list | EXISTS | Add integration status column |
| Dashboard placeholders | EXISTS | Replace fake numbers with real sync |

**Gate:** User can register, connect test site, see connected status.

---

## Milestone 2 — Connector (maps to spec M2)

**Scope:** Authentication, registration, heartbeat, capability discovery

| Task | Location | Notes |
|------|----------|-------|
| Create `includes/connector/` | RankPublish plugin | New namespace |
| `rankpublish/v1/health` | Connector | Module versions |
| `rankpublish/v1/integrations` | Connector | Adapter registry |
| `rankpublish/v1/capabilities` | Connector | Merge TR + synthesized SP |
| Pairing client update | Replace `Nashir_Client` or alias | Point to rankpublish REST URL |
| Heartbeat extend | Include integration versions | |
| SaaS store capabilities | New Prisma models | |

**Gate:** After connect, SaaS displays ThinkRank + SchedulePress as available integrations.

**Test site:** `rankpublish-test.local` + QA script

---

## Milestone 3 — ThinkRank adapter (maps to spec M3)

**Scope:** Post discovery, SEO read/write, settings, core capabilities

| Action | Engine call | Test |
|--------|-------------|------|
| `seo.post.read` | GET metadata | Match WP admin |
| `seo.post.write` | POST metadata | Verify in ThinkRank metabox |
| `seo.settings.read` | GET settings | |
| `seo.settings.write` | POST settings | |
| `posts.list` | WP_Query + optional SEO enrich | |

**Gate:** SEO title updated in RankPublish → visible in ThinkRank Essential SEO.

---

## Milestone 4 — SchedulePress adapter (maps to spec M4)

**Scope:** Social accounts status, posts, scheduling, calendar, publishing

| Action | Engine call | Test |
|--------|-------------|------|
| `publishing.post.read` | GET post-panel | |
| `publishing.post.write` | POST post-panel | Schedule date in WP |
| `publishing.calendar.list` | wpscp/v1/posts | |
| `social.profiles.list` | Settings API | |

**Gate:** Schedule post from RankPublish → appears in SchedulePress calendar.

---

## Milestone 5 — Unified post workspace (maps to spec M5)

**Scope:** Single post view combining content + SEO + social + schedule

| Component | Work |
|-----------|------|
| SaaS route `/app/sites/[id]/posts/[wpPostId]` | New page |
| Unified post DTO | Connector `GET /posts/{id}` |
| Tabbed UI | SEO, Social, Schedule panels |
| Capability-gated tabs | Hide if integration missing |

**Gate:** Real user manages one post entirely from RankPublish without opening WP admin.

**This is the MVP definition from product spec.**

---

## Milestone 6 — Billing (maps to spec M6)

| Task | Current | Target |
|------|---------|--------|
| Trial duration | 14 days | 7 days |
| Price | $9.90/$99 | Confirm |
| Access control | Partial | Block actions when expired |
| Card billing | Missing | Stripe (future) — manual seats OK for MVP |

**Gate:** Expired trial blocks mutating actions with clear UX.

---

## Milestone 7 — Logs & notifications (maps to spec M7)

| Feature | Work |
|---------|------|
| ActionLog model | Prisma + write on every action |
| Activity feed UI | `/app/activity` |
| Error surfacing | Map engine errors to user messages |
| Reconnect prompts | OAuth expired flows |

**Gate:** Failure test suite (spec section 34) passes with readable messages.

---

## Milestone 8 — Production (maps to spec M8)

| Area | Tasks |
|------|-------|
| Security | Rate limits, secret encryption, checklist |
| Performance | Async queue for bulk social publish |
| Testing | Unit + integration + E2E critical paths |
| Deploy | rankpublish.com cutover |
| Legal | Sign-off for Pro features in SaaS |
| Plugin zip | Public download from SaaS |
| Update channel | RankPublish plugin updates |

**Gate:** Launch criteria met (spec section 32 + 33).

---

## Cursor workflow (from product spec)

```
PHASE 0  Audit                    ✅ Complete — await review
PHASE 1  Architecture sign-off    ← Next (no code without approval)
PHASE 2  Connector core
PHASE 3  ThinkRank adapter
PHASE 4  SchedulePress adapter
PHASE 5  SaaS action API + post workspace
PHASE 6  Billing alignment
PHASE 7  Activity + errors
PHASE 8  Security + production
```

---

## Recommended first coding prompt (after Phase 1 approval)

Do **not** use until architecture signed off:

```
Implement RankPublish Connector Phase 2 only:
- Add includes/connector/ to rankpublish plugin
- Implement rankpublish/v1/health, /integrations, /capabilities
- Reuse Nashir HMAC signing pattern
- ThinkRankAdapter: wrap GET thinkrank/v1/capabilities and GET/POST metadata
- SchedulePressAdapter: synthesize capabilities from WPSP_VERSION
- Do not build SaaS UI yet
- Add PHPUnit or WP-CLI eval tests for health + discovery
```

---

## Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Two parallel codebases (Nashir vs RankPublish) | High | Phase 1 ADR, explicit deprecation |
| Engine REST requires WP cookie auth | High | Service user decision in Phase 1 |
| Legal block on Pro features | High | Early legal review |
| RankPublish plugin not in git | Medium | Add to monorepo in Phase 1 |
| AI action cost abuse | Medium | Rate limits |
| OAuth social flows need browser | Medium | Keep OAuth in WP; SaaS shows status |

---

## Success metrics (MVP)

From product spec section 32:

> A real user connects a real WordPress site, sees posts, opens a post, edits SEO from RankPublish, uses SchedulePress scheduling/social, and changes reflect on the live site.

**Measurable checks:**
1. Connect ≤ 2 minutes
2. Discovery shows ThinkRank + SchedulePress
3. SEO edit round-trip < 5 seconds (local site)
4. Schedule round-trip visible in SP calendar
5. Zero direct DB writes from SaaS

---

## Document maintenance

Update this roadmap when:
- Phase gates pass
- Architecture decisions change
- New integrations added
- Legal/commercial status changes

Last audit baseline: RankPublish plugin **0.8.0**, Nashir plugin **1.3.0**, ThinkRank **1.31.0**, SchedulePress **5.3.3**.
