# PublisherWP

Original scheduling platform for WordPress sites: the account, calendar, and subscription live in the cloud; a light plugin runs on the site.

This project is **not** a rebrand of any commercial plugin. The code is written from scratch.

## Local development

Optional Postgres via Docker on port `5433`:

```bash
docker compose -f deploy/local/docker-compose.yml up -d
cd apps/web
copy .env.example .env
```

In `.env` use:

```
DATABASE_URL=postgresql://nashir:nashir@127.0.0.1:5433/nashir
APP_URL=http://127.0.0.1:3000
```

Or keep `DATABASE_URL` on your current cloud Postgres.

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://127.0.0.1:3000 (the app binds IPv4 on purpose).

## Production on Contabo / ServerAvatar

See [deploy/contabo/README.md](deploy/contabo/README.md): Node 22 + PM2 + Nginx + Postgres + HTTPS.

No Vercel dependency.

Environment: `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, and `APP_URL`.

## Product

- Activate the plugin by signing in with a PublisherWP account (email + password).
- One seat per site: **$9.90 / month** or **$99 / year**. Card billing comes later; trial/manual seats work now.
- Unbind a domain and attach another on the same seat without buying again.
- Calendar, scheduling, republishing, and social sharing from the account or from WordPress.
