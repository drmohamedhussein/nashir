import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-ink/10 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/app" className="font-bold">
              ناشر
            </Link>
            <nav className="flex gap-4 text-sm text-ink-soft">
              <Link href="/app">المواقع</Link>
              <Link href="/app/calendar">التقويم</Link>
            </nav>
          </div>
          <LogoutButton name={session.name} />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
