import Link from "next/link";
import { redirect } from "next/navigation";
import { AppDashboardShell } from "@/components/rankpublish/app-dashboard-shell";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const locale = await getLocale();
  const copy = t(locale);

  return (
    <AppDashboardShell
      locale={locale}
      userName={session.name}
      logoutLabel={copy.logout}
      labels={copy as unknown as Record<string, string>}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </AppDashboardShell>
  );
}
