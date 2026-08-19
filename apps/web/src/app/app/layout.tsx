import { redirect } from "next/navigation";
import { AppDashboardShell } from "@/components/rankpublish/app-dashboard-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  const siteCount = await prisma.site.count({
    where: { workspaceId: session.workspaceId },
  });

  return (
    <AppDashboardShell
      locale={locale}
      userName={session.name}
      workspaceId={session.workspaceId}
      logoutLabel={copy.logout}
      labels={copy as unknown as Record<string, string>}
      hasConnectedSite={siteCount > 0}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </AppDashboardShell>
  );
}
