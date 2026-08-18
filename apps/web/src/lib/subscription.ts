import { prisma } from "./db";
import { isSubscriptionLive } from "./plans";

export class SubscriptionInactiveError extends Error {
  code = "SUBSCRIPTION_INACTIVE" as const;
}

export async function assertWorkspaceSubscriptionLive(workspaceId: string): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (!sub || !isSubscriptionLive(sub.status, sub.currentPeriodEnd)) {
    throw new SubscriptionInactiveError();
  }
}

export async function getWorkspaceSubscription(workspaceId: string) {
  return prisma.subscription.findFirst({
    where: { workspaceId },
    include: { plan: true, site: true },
    orderBy: { createdAt: "desc" },
  });
}
