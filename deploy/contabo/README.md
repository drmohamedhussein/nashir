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

This uploads `apps/web`, runs `prisma db push`, `npm run build`, starts PM2, and sets `rankpublish_cloud_url` on WordPress.

### 2. Nginx split (required — fixes empty `/app`)

Without this, WordPress serves `/app` as an empty page with old theme.

Copy [nginx-nashir-split.conf](nginx-nashir-split.conf) to the server, adjust PHP socket path, reload nginx.

### 3. Deploy marketing (rankpublish-site plugin)

```powershell
node deploy/contabo/deploy-rankpublish-site.cjs
```

Replaces old **Nashir** theme branding with **RankPublish** rankpublish-site templates.

### 4. Verify

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
