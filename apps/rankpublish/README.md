# RankPublish WordPress Plugin (connector source)

The full merged plugin (ThinkRank + SchedulePress + RankPublish shell) lives on LocalWP:

`C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/rankpublish`

This folder tracks **connector changes** in git. After editing here or on LocalWP, sync both ways:

```powershell
# LocalWP → repo
robocopy "C:\Users\drmoh\Local Sites\rankpublish\app\public\wp-content\plugins\rankpublish\includes\connector" `
  "C:\Users\drmoh\Projects\nashir\apps\rankpublish\includes\connector" /E

# Repo → rankpublish-test
node deploy/local/switch-product-mode.cjs product --site rankpublish-test --sync
```

## Connector (v1.0.0) — Phase 2

- REST namespace: `rankpublish/v1`
- Routes: `/health`, `/integrations`, `/capabilities`, `/actions`, `/posts`, `/posts/{id}`
- Adapters: ThinkRank (SEO), SchedulePress (publishing)
- Auth: HMAC (`X-RankPublish-*` + legacy `X-Nashir-*`)
- Engine dispatch: internal REST + service user `rankpublish-connector`

Plugin version with connector: **0.9.0**

## WordPress admin

**RankPublish → Cloud Connect** — pairing code flow to Nashir/RankPublish web app.

## Required `class-plugin.php` hook

After modules boot:

```php
require_once RANKPUBLISH_PATH . 'includes/connector/class-connector.php';
\RankPublish\Connector\Connector::boot();
```
