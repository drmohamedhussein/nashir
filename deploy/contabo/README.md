# PublisherWP on Contabo + ServerAvatar

Same pattern as Arabya: Next.js behind Nginx, process manager PM2, Postgres on the VPS.

## Local

```bash
cd apps/web
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Optional local Postgres:

```bash
docker compose -f deploy/local/docker-compose.yml up -d
```

Then set `DATABASE_URL=postgresql://nashir:nashir@127.0.0.1:5433/nashir`.

## Live (ServerAvatar trial domain — nashir.satest.top)

**Two layers on one domain:**

| Path | Serves |
|------|--------|
| `/`, `/pricing`, `/download`, … | WordPress **rankpublish-site** (marketing) |
| `/app`, `/api`, `/login`, `/register` | Next.js **SaaS** (accounts, pairing, workspace) |

### 1. Deploy SaaS (Next.js)

```powershell
$env:NASHIR_SSH_HOST='YOUR_HOST'
$env:NASHIR_SSH_USER='YOUR_USER'
$env:NASHIR_SSH_PASS='YOUR_PASS'
   node deploy/contabo/deploy-saas.cjs
   ```

   Or run everything in one step:

   ```powershell
   node deploy/contabo/deploy-all.cjs
   ```

   `deploy-all.cjs` also runs PayPal column migration, marketing plugin, and SaaS proxy.

This uploads `apps/web`, runs `prisma db push`, `npm run build`, starts PM2, and sets `rankpublish_cloud_url` on WordPress.

### 2. Nginx split (required — fixes empty `/app`)

Without this, WordPress serves `/app` as an empty page with old theme.

Copy [nginx-nashir-split.conf](nginx-nashir-split.conf) to the server, adjust PHP socket path, reload nginx.

### 3. Deploy marketing (rankpublish-site plugin)

```powershell
node deploy/contabo/deploy-rankpublish-site.cjs
```

Replaces old **Nashir** theme branding with **RankPublish** rankpublish-site templates.

### 4. Package plugin ZIPs

```bash
node deploy/package-rankpublish.cjs
```

Builds `dist/rankpublish-site.zip`, `dist/rankpublish-connector.zip`, and `dist/rankpublish-bridge.zip` for upload to WordPress.

### 5. Verify

- https://nashir.satest.top/ → RankPublish marketing (WP)
- https://nashir.satest.top/register → SaaS signup
- https://nashir.satest.top/app → SaaS dashboard (after login)
- https://nashir.satest.top/api/health → `{"ok":true,"database":"connected"}`

Env on server (`/var/www/nashir/apps/web/.env`): `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `APP_URL=https://nashir.satest.top`

## RankPublish plugin (experimental on this host)

Until RankPublish.com launches, the merged plugin can be uploaded to this same WordPress:

```powershell
$env:NASHIR_SSH_HOST='…'
$env:NASHIR_SSH_USER='…'
$env:NASHIR_SSH_PASS='…'
node .\deploy\contabo\deploy-rankpublish.cjs
```

Keep the four standalone SchedulePress / ThinkRank plugins **active** on the dev stack; keep **rankpublish** inactive. Use `activate-dev-stack.cjs` after deploys.

```powershell
node .\deploy\contabo\deploy-rankpublish-site.cjs
node .\deploy\contabo\deploy-upstream-plugin.cjs thinkrank-pro
node .\deploy\contabo\audit-staging-all.cjs
node .\deploy\contabo\activate-dev-stack.cjs
```

Credentials stay in env only — never commit them.

## Production (rankpublish.com)

When the production domain is ready:

1. **DNS** — Point `rankpublish.com` and `www.rankpublish.com` to the Contabo VPS IP.
2. **SSL** — Enable Let's Encrypt in ServerAvatar for the domain.
3. **WordPress marketing** — Deploy `rankpublish-site` plugin; set `rankpublish_cloud_url` option to `https://rankpublish.com`.
4. **SaaS routing** — Use the mu-plugin proxy (`wordpress/mu-plugins/rankpublish-saas-proxy.php`) or Nginx split config so `/app`, `/api`, `/login`, `/register` reach Next.js on port 3001.
5. **Environment** — On server `/var/www/nashir/apps/web/.env`:
   - `APP_URL=https://rankpublish.com`
   - `DATABASE_URL` (MySQL with `rp_*` + `wp_*` tables)
   - `AUTH_SECRET`, `CRON_SECRET`
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` (`sandbox` or `live`)
   - `PAYPAL_WEBHOOK_ID`
   - `PAYPAL_PLAN_STARTER_MONTHLY`, `PAYPAL_PLAN_GROWTH_MONTHLY`, `PAYPAL_PLAN_SCALE_MONTHLY` (and yearly variants — PayPal plan IDs like `P-xxx`)
6. **Database** — Run `npx prisma db push` (never use `--accept-data-loss` on shared WP+SaaS DB).
7. **Plugin ZIPs** — `node deploy/package-rankpublish.cjs` → upload `dist/rankpublish-site.zip` and distribute `dist/rankpublish-bridge.zip` to client sites.
8. **PayPal webhook** — Register `https://rankpublish.com/api/webhooks/paypal` in PayPal Developer dashboard.
9. **Verify** — `/api/health`, `/register`, `/app`, marketing homepage, bridge connect flow.
