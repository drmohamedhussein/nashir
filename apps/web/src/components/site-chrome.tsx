import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="text-xl font-bold tracking-tight">
        ناشر
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/download" className="text-ink-soft hover:text-ink">
          الإضافة
        </Link>
        <Link href="/login" className="text-ink-soft hover:text-ink">
          دخول
        </Link>
        <Link href="/register" className="rounded-full bg-ink px-4 py-2 text-paper hover:bg-ink-soft">
          ابدأ مجاناً
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 flex max-w-6xl flex-wrap gap-4 border-t border-ink/10 px-6 py-8 text-sm text-ink-soft">
      <Link href="/download">تنزيل الإضافة</Link>
      <Link href="/privacy">الخصوصية</Link>
      <Link href="/terms">الشروط</Link>
      <span className="ms-auto">ناشر — إصدار عام تجريبي مجاني</span>
    </footer>
  );
}
