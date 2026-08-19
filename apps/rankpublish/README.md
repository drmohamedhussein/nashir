# RankPublish WordPress Plugin (customer product)

**This is the plugin customers install.** RankPublish Site Core (`apps/rankpublish-site`) is HQ-only and is never distributed to customers.

## Source of truth

| Location | Role |
|----------|------|
| `https://rankpublish-test.local/` | Customer product development site |
| `C:/Users/drmoh/Local Sites/rankpublish-test/app/public/wp-content/plugins/rankpublish` | Full merged plugin (SEO + Scheduler + connector) |
| `apps/rankpublish/includes/connector/` | Connector code tracked in git (sync into the full plugin) |

Do **not** ship:

- `rankpublish-site` (Site Core)
- stub / connector-only zips (~3.9 MB)
- `rankpublish (6).zip` and any other undersized download from `/app`

Public download on staging is the **full** plugin zip:

`https://nashir.satest.top/wp-content/uploads/rankpublish/rankpublish.zip`

Pack and upload:

```powershell
robocopy "C:\Users\drmoh\Projects\nashir\apps\rankpublish\includes\connector" `
  "C:\Users\drmoh\Local Sites\rankpublish-test\app\public\wp-content\plugins\rankpublish\includes\connector" /E
node deploy/contabo/upload-product-zip.cjs
```

## Connector (v1.0.0)

- REST namespace: `rankpublish/v1`
- Auth: HMAC (`X-RankPublish-*` + legacy `X-Nashir-*`)
- Pairing: 6-character code via RankPublish Cloud → WordPress **Cloud Connect**

After modules boot (`includes/class-plugin.php`):

```php
require_once RANKPUBLISH_PATH . 'includes/connector/class-connector.php';
\RankPublish\Connector\Connector::boot();
```
