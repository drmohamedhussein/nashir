import { SiteCard } from "@/components/site-card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const locale = await getLocale();
  const copy = t(locale);

  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId },
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });

  if (sites.length === 0) {
    redirect("/app/getting-started");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.sites}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.sitesHint}</p>
      <div className="mt-6 space-y-3">
        {sites.map((site) => (
          <SiteCard
            key={site.id}
            id={site.id}
            name={site.name}
            url={site.url}
            status={site.status}
            wpVersion={site.wpVersion}
            lastSeen={site.lastSeenAt ? site.lastSeenAt.toLocaleString(locale) : null}
            subscriptionId={site.subscription?.id}
            workerStatus={site.workerStatus}
            connectorType={site.connectorType}
            locale={locale}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/app/billing" className="text-ink-soft hover:text-brand">
          {copy.billing}
        </Link>
        <a href="/wp-content/uploads/rankpublish/rankpublish.zip" className="text-ink-soft hover:text-brand">
          {copy.download}
        </a>
      </div>
    </div>
  );
}
