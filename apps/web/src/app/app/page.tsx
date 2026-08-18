import { ConnectionWizard } from "@/components/rankpublish/connection-wizard";
import { SiteCard } from "@/components/site-card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { publicAppUrl } from "@/lib/environments";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const locale = await getLocale();
  const copy = t(locale);
  const cloudAppUrl = publicAppUrl();

  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId },
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {sites.length === 0 ? (
        <div className="lg:col-span-2 rounded-2xl border border-brand/20 bg-brand/5 px-5 py-4 text-sm">
          {copy.appWelcomeBanner}{" "}
          <Link href="/app/getting-started" className="font-semibold text-brand hover:underline">
            {copy.appWelcomeLink}
          </Link>
        </div>
      ) : null}
      <section>
        <h1 className="text-2xl font-bold">{copy.sites}</h1>
        <p className="mt-2 text-sm text-ink-soft">{copy.sitesHint}</p>
        <div className="mt-6 space-y-3">
          {sites.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 p-8 text-sm text-ink-soft">{copy.noSites}</p>
          ) : (
            sites.map((site) => (
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
            ))
          )}
        </div>
      </section>
      <div className="min-w-0 space-y-4">
        <Link href="/app/billing" className="block rounded-2xl border border-ink/10 bg-white p-6 text-sm shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
          {copy.billingTeaser}
        </Link>
        <ConnectionWizard locale={locale} appUrl={cloudAppUrl} />
        <a href="/wp-content/uploads/rankpublish/rankpublish.zip" className="block rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink-soft shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
          {copy.download}
        </a>
      </div>
    </div>
  );
}
