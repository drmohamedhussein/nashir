import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function DownloadPage() {
  return (
    <div className="min-h-full">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">إضافة ووردبريس</h1>
        <p className="mt-4 leading-8 text-ink-soft">
          نزّل الموصل، ارفعه إلى موقعك، ثم اربط الحساب برمز من لوحة ناشر. الإضافة لا تحتوي كوداً
          لطرف ثالث.
        </p>
        <ol className="mt-8 list-decimal space-y-3 pe-6 text-sm leading-7">
          <li>أنشئ حساباً على ناشر.</li>
          <li>نزّل الملف وثبّته من الإضافات ← أضف جديداً ← رفع.</li>
          <li>من لوحة ناشر أنشئ رمز ربط والصقه في صفحة ناشر داخل ووردبريس.</li>
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="/downloads/nashir.zip"
            className="rounded-full bg-leaf px-5 py-3 text-sm font-semibold text-white"
          >
            تنزيل nashir.zip
          </a>
          <Link href="/register" className="rounded-full border border-ink/15 px-5 py-3 text-sm">
            إنشاء حساب أولاً
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
