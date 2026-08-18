# RankPublish Worker and WordPress Sync Architecture

Synced from [drmohamedhussein/rankpublish](https://github.com/drmohamedhussein/rankpublish) (2026-08-17).

## Purpose

RankPublish operates **SchedulePress** and **ThinkRank** inside an isolated WordPress Worker owned by RankPublish for each connected customer site. The customer uses the RankPublish web interface only; they do not receive access to the original product interfaces or to the Worker environment.

## Runtime roles

| Component | Responsibility |
|-----------|----------------|
| RankPublish SaaS | Auth, workspaces, billing, command queue, customer UI |
| Customer site | Canonical public website and content destination |
| RankPublish Bridge | Small connector on the customer site; handshake + limited REST |
| Isolated Worker | One WordPress deployment per site with SchedulePress + ThinkRank |

## Connection paths

| Path | Use case | Status in this stack |
|------|----------|----------------------|
| **RankPublish product plugin** (`rankpublish/v1` + HMAC) | Customer installs merged rankpublish plugin; pairs via cloud app | **Active** — primary MVP |
| **RankPublish Bridge** (`rankpublish-bridge/v1`) | Worker fleet bootstrap; one-time token handshake | Packaged from Site Core; SaaS endpoint planned |

Bridge bootstrap: `POST /api/rankpublish/bridge/connect` with `siteId`, `token`, `siteUrl`.

Product pairing: pairing code via RankPublish Cloud → `rankpublish/v1` signed REST.

## Site Core responsibilities

- Marketing front (PHP templates, bilingual)
- Upstream merge watch (ThinkRank / SchedulePress → `rankpublish/modules/*`)
- Connector package builder (`rankpublish-bridge.zip`, `rankpublish.zip` in uploads)
- Dev stack admin (four upstream plugins vs product-only)

See also `MERGE-GUIDE.md` in the rankpublish product plugin docs folder.
