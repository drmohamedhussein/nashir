import { BillingPanel } from "@/components/billing-panel";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { workspaceId: session.workspaceId },
    include: { site: true },
    orderBy: { createdAt: "desc" },
  });

  const locale = await getLocale();
  const copy = t(locale);

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.billing}</h1>
      <BillingPanel
        locale={locale}
        seats={subscriptions.map((row) => ({
          id: row.id,
          interval: row.interval,
          status: row.status,
          priceCents: row.priceCents,
          currentPeriodEnd: row.currentPeriodEnd.toISOString(),
          siteId: row.siteId,
          siteUrl: row.site?.url ?? null,
          siteName: row.site?.name ?? null,
        }))}
      />
    </div>
  );
}
