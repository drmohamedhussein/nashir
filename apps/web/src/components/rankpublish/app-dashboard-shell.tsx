"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Rocket,
  SearchCheck,
  Settings2,
  Share2,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/rankpublish/brand-mark";
import { WorkspaceSwitcher } from "@/components/rankpublish/workspace-switcher";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const workspaceNav = (copy: Record<string, string>): NavItem[] => [
  { href: "/app", label: copy.sites ?? "Sites", icon: LayoutDashboard },
  { href: "/app/getting-started", label: copy.gettingStarted ?? "Getting Started", icon: Rocket },
  { href: "/app/calendar", label: copy.scheduler ?? copy.calendar ?? "Calendar", icon: CalendarDays },
  { href: "/app/seo", label: copy.seo ?? "SEO", icon: SearchCheck },
  { href: "/app/social", label: copy.social ?? "Social", icon: Share2 },
];

const manageNav = (copy: Record<string, string>): NavItem[] => [
  { href: "/app/team", label: copy.team ?? "Team", icon: UsersRound },
  { href: "/app/activity", label: copy.activity ?? "Activity", icon: Activity },
  { href: "/app/billing", label: copy.billing ?? "Billing", icon: CreditCard },
  { href: "/app/settings", label: copy.settings ?? "Settings", icon: Settings2 },
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

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

export function AppDashboardShell({
  locale,
  userName,
  workspaceId,
  logoutLabel,
  labels,
  children,
}: {
  locale: Locale;
  userName: string;
  workspaceId: string;
  logoutLabel: string;
  labels: Record<string, string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const workspaceName = `${userName || "RankPublish"} Workspace`;

  return (
    <div className="flex min-h-screen bg-[#f6f7fb]" dir={dir}>
      <aside className="hidden w-[248px] shrink-0 flex-col bg-[#11172a] text-slate-300 lg:flex">
        <div className="flex h-[76px] items-center px-4">
          <Link href="/app" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
            <BrandMark className="text-white [&_span:last-child_span:last-child]:text-sky-300/75" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col px-3 pb-6">
          <NavGroup title={labels.workspaceKicker ?? "Workspace"} items={workspaceNav(labels)} pathname={pathname} />
          <div className="mb-4 h-px bg-white/8" />
          <NavGroup title={labels.manageKicker ?? "Manage"} items={manageNav(labels)} pathname={pathname} />
        </nav>
        <div className="border-t border-white/8 px-4 py-4 text-sm text-slate-400">
          <LogoutButton name={userName} label={logoutLabel} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200/75 bg-white/80 px-4 backdrop-blur-xl md:px-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {labels.workspaceKicker ?? "Workspace"}
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{workspaceName}</p>
          </div>
          <div className="flex items-center gap-3">
            <WorkspaceSwitcher activeWorkspaceId={workspaceId} />
            <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {labels.systemsOperational ?? "Systems operational"}
            </div>
          </div>
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/app">
              <BrandMark compact />
            </Link>
            <LogoutButton name={userName} label={logoutLabel} />
          </div>
        </header>
        <main className="min-h-[calc(100vh-76px)] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
