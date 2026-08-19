# AGENTS.md

## Cursor Cloud specific instructions

### What is runnable here
This is a loosely-coupled monorepo. The only app that builds and runs inside the
cloud VM is the RankPublish SaaS at `apps/web` (Next.js 16 + React 19 + Prisma +
MySQL). The other `apps/*` directories (`plugin`, `rankpublish`, `rankpublish-site`,
`wp-theme`) and `wordpress/mu-plugins` are WordPress PHP plugins/themes that require an
external WordPress install (LocalWP on a developer machine) to run — they are just
files synced to a WP site and are **not** runnable/testable in this VM. Focus dev work
on `apps/web` unless you specifically need to edit PHP connector code. All commands
below run from `apps/web` unless noted.

### Database (required, non-obvious)
`apps/web` needs MySQL. This VM uses MariaDB, which is installed in the base image but
**not** started automatically (no systemd). Start it each session with:

```bash
sudo service mariadb start
```

Local dev DB is `rankpublish_saas` with user `rankpublish` / password `rankpublish`.
`apps/web/.env` is git-ignored and already exists in the VM snapshot pointing at
`mysql://rankpublish:rankpublish@127.0.0.1:3306/rankpublish_saas` (plus dev
`AUTH_SECRET`/`CRON_SECRET`; PayPal vars blank — trial seats work without PayPal). If
`.env` is missing, copy `apps/web/.env.example` and set `DATABASE_URL` to that local URL.

### Schema — never `prisma db push`
The `rp_*` tables can co-exist with WordPress `wp_*` tables in a shared DB, so
`prisma db push` is blocked (`npm run db:push` refuses). Apply/refresh the schema with
the safe applier (idempotent, `CREATE TABLE IF NOT EXISTS` + additive alters):

```bash
node ../../deploy/contabo/run-staging-schema-safe.cjs .
```

Seed plans with `node prisma/seed.cjs`. Note: `seed.cjs` run via plain `node` does
**not** auto-load `.env`, so export the URL first, e.g.
`export $(grep '^DATABASE_URL=' .env | sed 's/"//g') && node prisma/seed.cjs`.

### Run / lint / test / build
- Dev server: `npm run dev` → http://127.0.0.1:3000 (health: `/api/health` returns
  `{"ok":true,"database":"connected"}` when the DB is reachable).
- Tests: `npm test` (Vitest). Lint: `npm run lint` (ESLint).
- CI (`.github/workflows/ci.yml`) does **not** run lint; it runs `npx prisma validate`,
  a grep guard refusing SQL that drops `wp_*` tables, and `npm test`. `npm run lint`
  currently reports one pre-existing error (`prisma/seed.cjs` uses `require()`) plus
  unused-var warnings — these are pre-existing and not CI-gating.
- Build: `npm run build` (`prisma generate && next build`); prefer `npm run dev` for
  development.

### Next.js version caveat
`apps/web/AGENTS.md` is auto-generated/re-added by `next dev` and warns this is Next.js
16 with breaking changes vs. older versions — consult `node_modules/next/dist/docs/`
before writing Next.js code.
