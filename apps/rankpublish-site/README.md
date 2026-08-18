# RankPublish Site Core

WordPress plugin for the RankPublish **marketing / dev stack** site (`rankpublish.com`).

## Role

| Plugin | Where |
|--------|--------|
| **rankpublish-site** (this) | Official site — marketing UI, merge watch, connector packages |
| **rankpublish** | Customer sites — merged ThinkRank + SchedulePress + Cloud Connect |

## Monorepo sync

```powershell
# Repo → LocalWP (rankpublish + rankpublish-test)
node deploy/local/sync-rankpublish-site.cjs

# Connector → product plugin on test site
node deploy/local/switch-product-mode.cjs product --site rankpublish-test --sync
```

## GitHub merge (drmohamedhussein/rankpublish)

- `includes/bridge/rankpublish-bridge.php` — Bridge connector (Worker handshake)
- `includes/class-connector-packages.php` — builds `rankpublish-bridge.zip`
- `docs/worker-sync-architecture.md` — Bridge vs product connector docs
- Marketing art synced from `apps/web/public/art/`

SaaS dashboard (React/tRPC) stays in `apps/web`; it is not embedded in WordPress.

## Deploy live

```powershell
# Requires NASHIR_SSH_* env
node deploy/contabo/deploy-rankpublish-site.cjs
```

Uses `apps/rankpublish-site` from this repo when present.
