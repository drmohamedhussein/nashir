# PublisherWP web

From this folder:

```bash
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Listens on http://127.0.0.1:3000. Production is Contabo/ServerAvatar (PM2 + Nginx), not Vercel.
