import { prisma } from "./db";
import { assertWorkspaceSubscriptionLive } from "./subscription";

export type Entitlement = {
  capabilityKey: string;
  isIncluded: boolean;
  quota: number | null;
};

const ACTION_CAPABILITY_MAP: Record<string, string> = {
  "seo.post.write": "seo.metadata",
  "seo.audit.run": "seo.audit",
  "publishing.post.write": "schedule.calendar",
  "schedule.queue.push": "schedule.queue",
};

export function resolveActionCapability(action: string): string {
  return ACTION_CAPABILITY_MAP[action] ?? action;
}

export async function getWorkspaceEntitlements(workspaceId: string): Promise<Entitlement[]> {
  const sub = await prisma.subscription.findFirst({
    where: { workspaceId },
    include: { plan: { include: { entitlements: true } } },
    orderBy: { createdAt: "desc" },
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

  if (match.quota !== null && match.capabilityKey === "seo.audit") {
    const used = await prisma.seoAudit.count({
      where: {
        site: { workspaceId },
        createdAt: { gte: monthStart() },
      },
    });
    if (used >= match.quota) {
      return { allowed: false, quota: match.quota };
    }
  }

  return { allowed: true, quota: match.quota };
}

export async function assertActionEntitlement(workspaceId: string, action: string): Promise<void> {
  await assertWorkspaceSubscriptionLive(workspaceId);
  const capabilityKey = resolveActionCapability(action);
  const { allowed } = await checkEntitlement(workspaceId, capabilityKey);
  if (!allowed) {
    const error = new Error("CAPABILITY_UNAVAILABLE");
    (error as Error & { code: string }).code = "CAPABILITY_UNAVAILABLE";
    throw error;
  }
}

export async function checkSiteLimit(workspaceId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const sub = await prisma.subscription.findFirst({
    where: { workspaceId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
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

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
