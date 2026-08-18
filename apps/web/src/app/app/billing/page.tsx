import { Suspense } from "react";
import { BillingPanel } from "@/components/billing-panel";
import { getSession } from "@/lib/auth";
import { isPayPalConfigured } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { SEED_PLANS } from "@/lib/plans";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [subscriptions, dbPlans] = await Promise.all([
    prisma.subscription.findMany({
      where: { workspaceId: session.workspaceId },
      include: { site: true, plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceCents: "asc" } }),
  ]);

  const locale = await getLocale();
  const copy = t(locale);
  const plans =
    dbPlans.length > 0
      ? dbPlans.map((p) => ({
          id: p.id,
          name: p.name,
          monthlyPriceCents: p.monthlyPriceCents,
          yearlyPriceCents: p.yearlyPriceCents,
          siteLimit: p.siteLimit,
        }))
      : SEED_PLANS.map((p) => ({
          id: p.id,
          name: p.name,
          monthlyPriceCents: p.monthlyPriceCents,
          yearlyPriceCents: p.yearlyPriceCents,
          siteLimit: p.siteLimit,
        }));

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.billing}</h1>
      <Suspense fallback={null}>
        <BillingPanel
          locale={locale}
          paypalConfigured={isPayPalConfigured()}
          plans={plans}
          seats={subscriptions.map((row) => ({
            id: row.id,
            interval: row.interval,
            status: row.status,
            priceCents: row.priceCents,
            planId: row.planId,
            planName: row.plan?.name ?? null,
            currentPeriodEnd: row.currentPeriodEnd.toISOString(),
            siteId: row.siteId,
            siteUrl: row.site?.url ?? null,
            siteName: row.site?.name ?? null,
            paypalSubscriptionId: row.paypalSubscriptionId,
          }))}
        />
      </Suspense>
    </div>
  );
}
