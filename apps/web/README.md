# PublisherWP web

From this folder:

```bash
copy .env.example .env
npm install
npx prisma generate
node ../../deploy/contabo/run-staging-schema-safe.cjs .
npm run dev
```

Do not run `prisma db push` if `DATABASE_URL` is the WordPress MySQL database.

Listens on http://127.0.0.1:3000. Production is Contabo/ServerAvatar (PM2 + Nginx), not Vercel.
