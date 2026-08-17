"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Rocket,
  Settings2,
  Share2,
} from "lucide-react";
import { BrandMark } from "@/components/rankpublish/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const mainNav = (copy: Record<string, string>): NavItem[] => [
  { href: "/app", label: copy.sites, icon: LayoutDashboard },
  { href: "/app/getting-started", label: copy.gettingStarted, icon: Rocket },
  { href: "/app/calendar", label: copy.calendar, icon: CalendarDays },
  { href: "/app/social", label: copy.social, icon: Share2 },
];

const accountNav = (copy: Record<string, string>): NavItem[] => [
  { href: "/app/billing", label: copy.billing, icon: CreditCard },
  { href: "/app/settings", label: copy.settings, icon: Settings2 },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active =
    item.href === "/app"
      ? pathname === "/app" || pathname.startsWith("/app/sites")
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors",
        active ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppDashboardShell({
  locale,
  userName,
  logoutLabel,
  labels,
  children,
}: {
  locale: Locale;
  userName: string;
  logoutLabel: string;
  labels: Record<string, string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="flex min-h-screen bg-background" dir={dir}>
      <aside className="hidden w-[248px] shrink-0 flex-col bg-[#11172a] text-slate-300 lg:flex">
        <div className="flex h-[76px] items-center px-4">
          <Link href="/app" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
            <BrandMark className="text-white [&_span:last-child_span:last-child]:text-sky-300/75" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
          {mainNav(labels).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <div className="my-4 border-t border-white/8" />
          {accountNav(labels).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="border-t border-white/8 px-4 py-4 text-sm text-slate-400">
          <LogoutButton name={userName} label={logoutLabel} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/app">
            <BrandMark compact />
          </Link>
          <LogoutButton name={userName} label={logoutLabel} />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
