import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteWorkspace } from "@/components/site-workspace";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

type Params = { params: Promise<{ siteId: string }> };

export default async function SiteWorkspacePage({ params }: Params) {
  const session = await getSession();
  if (!session) {
    notFound();
  }

  const { siteId } = await params;
  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site) {
    notFound();
  }

  const locale = await getLocale();
  const copy = t(locale);
  const isRankPublish = site.restUrl.includes("rankpublish/v1");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/app" className="hover:text-brand">
              {copy.sites}
            </Link>
            {" / "}
            {site.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{site.name}</h1>
          <a className="mt-1 inline-block text-sm text-brand" href={site.url} target="_blank" rel="noreferrer">
            {site.url}
          </a>
        </div>
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs text-brand">
          {site.status === "connected" ? copy.connectedLabel : site.status}
        </span>
      </div>

      {!isRankPublish ? (
        <p className="mt-8 rounded-2xl border border-dashed border-ink/15 p-8 text-sm text-ink-soft">
          {copy.workspaceLegacySite}
        </p>
      ) : (
        <SiteWorkspace siteId={site.id} locale={locale} />
      )}
    </div>
  );
}
