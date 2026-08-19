# RankPublish — User Guide

Public pages:

- Marketing: `https://nashir.satest.top/guide/` (`?lang=ar` / `?lang=en`)
- Download: `https://nashir.satest.top/wp-content/uploads/rankpublish/rankpublish.zip`

## Product model

RankPublish is **one WordPress plugin** plus **one cloud account**.

The four engines run on the customer WordPress site:

| Engine | Menu on WordPress | Cloud counterpart |
|--------|-------------------|-------------------|
| SchedulePress | RankPublish → Scheduler | `/app/calendar` (synced calendar + links) |
| SchedulePress Pro | Same Scheduler SPA (automation) | `/app/calendar` |
| ThinkRank | RankPublish → SEO Dashboard / Essential SEO / AI Tools / Usages / Settings | `/app/seo` (synced scores + links) |
| ThinkRank Pro | Essential SEO Pro sections + Account | `/app/seo` |

The cloud does **not** clone those admin SPAs. It stores the account, seats, extra domains, and a synced calendar/SEO cache.

## Customer steps

1. Download and activate RankPublish on **your** WordPress. Do not install SchedulePress or ThinkRank as separate plugins.
2. Register at `/register` (7-day trial, then $9.99/month or $99/year per site).
3. Open Getting started and create a 6-character pairing code.
4. On WordPress open RankPublish → Cloud Connect and paste the cloud URL plus the code.
5. Use Scheduler, Calendar, and all SEO screens under the RankPublish menu.
6. Open `/app/calendar` and `/app/seo` for the synced cloud views. If the site URL is `.local`, open wp-admin once so the plugin can **push** posts.

## WordPress menus

Publish: Scheduler, Calendar, Publish workspace.

Rank: SEO Dashboard, Essential SEO (including Pro tools inside the SPA), AI Tools, Usages, SEO Settings, Account / License, Rank workspace.

Post editor: SEO box (title, description, focus keyword, schema).

Social network OAuth is configured in Scheduler on WordPress.

## Cloud account pages

`/app` sites · `/app/getting-started` pairing · `/app/calendar` · `/app/seo` · `/app/social` · `/app/team` · `/app/billing` · `/app/settings` · `/app/activity`

## HQ vs customer

| Surface | URL | Role |
|---------|-----|------|
| Staging SaaS | `https://nashir.satest.top` | Customer accounts |
| HQ Site Core | `https://nashir.satest.top/wp-admin` | Operator/marketing WordPress |
| Local HQ | `https://rankpublish.local` | Dev stack |
| Local customer | `https://rankpublish-test.local` | Full RankPublish plugin QA |

HQ Site Core wraps the four upstream plugins inside Publishing OS (Scheduler / SEO tabs). It is **not** a customer seat.

## Empty cloud calendar

The cloud cannot HTTP-pull `*.local` WordPress URLs. Heartbeat + `/sync` push from the plugin. Open the connected site’s wp-admin after pairing.
