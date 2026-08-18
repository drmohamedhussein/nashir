# PublisherWP

Original scheduling platform for WordPress sites: the account, calendar, and subscription live in the cloud; a light plugin runs on the site.

This project is **not** a rebrand of any commercial plugin. The code is written from scratch.

## Local development

SaaS tables are MySQL with the `rp_` prefix. On staging they share the WordPress database (`wp_*` + `rp_*`). Never run `prisma db push` against that shared URL.

```bash
cd apps/web
copy .env.example .env
npm install
npx prisma generate
node ../../deploy/contabo/run-staging-schema-safe.cjs .
npm run dev
```

`.env.example` points at LocalWP MySQL. Open http://127.0.0.1:3000.

## Production on Contabo / ServerAvatar

See [deploy/contabo/README.md](deploy/contabo/README.md): Node 22 + PM2 + Nginx + WordPress MySQL (`rp_*`) + HTTPS.
