# ناشر (Nashir)

منصة جدولة محتوى أصلية لمواقع ووردبريس: الحساب والتقويم في السحابة، وموصل خفيف داخل الموقع.

هذا المشروع **ليس** إعادة تسمية لأي إضافة تجارية. الكود مكتوب من الصفر.

## التشغيل المحلي

```bash
cd apps/web
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

افتح http://localhost:3000

## الإنتاج

- تطبيق الويب على Vercel
- قاعدة بيانات Postgres عبر `DATABASE_URL`
- الإضافة: `apps/web/public/downloads/nashir.zip`
- الجدولة: نبضة من ووردبريس كل دقيقة + cron يومي احتياطي `/api/cron/tick`

متغيرات البيئة: `DATABASE_URL` و`AUTH_SECRET` و`CRON_SECRET` و`APP_URL`.
