import { prisma } from "./db";

export type Entitlement = {
  capabilityKey: string;
  isIncluded: boolean;
  quota: number | null;
};

export async function getWorkspaceEntitlements(workspaceId: string): Promise<Entitlement[]> {
  const sub = await prisma.subscription.findFirst({
    where: { workspaceId },
    include: { plan: { include: { entitlements: true } } },
  });

  if (!sub?.plan) {
    return defaultEntitlements();
  }

  return sub.plan.entitlements.map((e) => ({
    capabilityKey: e.capabilityKey,
    isIncluded: e.isIncluded,
    quota: e.quota,
  }));
}

export async function checkEntitlement(
  workspaceId: string,
  capabilityKey: string,
): Promise<{ allowed: boolean; quota: number | null }> {
  const entitlements = await getWorkspaceEntitlements(workspaceId);
  const match = entitlements.find((e) => e.capabilityKey === capabilityKey);
  if (!match || !match.isIncluded) {
    return { allowed: false, quota: null };
  }
  return { allowed: true, quota: match.quota };
}

export async function checkSiteLimit(workspaceId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const sub = await prisma.subscription.findFirst({
    where: { workspaceId },
    include: { plan: true },
  });

  const limit = sub?.plan?.siteLimit ?? 1;
  const current = await prisma.site.count({ where: { workspaceId } });

  return { allowed: current < limit, current, limit };
}

function defaultEntitlements(): Entitlement[] {
  return [
    { capabilityKey: "schedule.calendar", isIncluded: true, quota: null },
    { capabilityKey: "seo.audit", isIncluded: true, quota: 10 },
  ];
}
