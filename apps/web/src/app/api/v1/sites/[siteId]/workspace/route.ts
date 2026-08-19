import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayload, readSignedHeaders } from "@/lib/crypto";
import { isSubscriptionLive, PLANS } from "@/lib/plans";
import { checkSiteLimit } from "@/lib/entitlements";

type Params = { params: Promise<{ siteId: string }> };

/**
 * Signed workspace snapshot for a connected WordPress site (Site Core / connector).
 */
export async function POST(request: Request, { params }: Params) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { workspace: true },
  });
  if (!site || !site.signingSecret) {
    return NextResponse.json({ ok: false, error: { message: "Site not found." } }, { status: 404 });
  }

  const body = await request.text();
  const { timestamp, signature } = readSignedHeaders(request);
  if (!verifyPayload(site.signingSecret, timestamp, body || "{}", signature)) {
    return NextResponse.json({ ok: false, error: { message: "Invalid signature." } }, { status: 401 });
  }

  const workspaceId = site.workspaceId;
  const now = new Date();

  const [sites, subscription, siteLimit, pendingJobs, scheduledPosts, seoAudits, postsTotal] =
    await Promise.all([
      prisma.site.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          workerStatus: true,
          wpVersion: true,
          lastSeenAt: true,
          createdAt: true,
        },
      }),
      prisma.subscription.findFirst({
        where: { workspaceId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      checkSiteLimit(workspaceId),
      prisma.scheduleJob.count({
        where: { siteId: site.id, status: "pending", runAt: { gte: now } },
      }),
      prisma.editorialPost.count({
        where: { siteId: site.id, scheduledAt: { gte: now } },
      }),
      prisma.seoAudit.count({ where: { siteId: site.id } }),
      prisma.editorialPost.count({ where: { siteId: site.id } }),
    ]);

  const live = subscription
    ? isSubscriptionLive(subscription.status, subscription.currentPeriodEnd)
    : false;

  await prisma.site.update({
    where: { id: site.id },
    data: { lastSeenAt: now },
  });

  return NextResponse.json({
    ok: true,
    data: {
      workspace: {
        id: workspaceId,
        name: site.workspace.name,
        slug: site.workspace.slug,
      },
      sites,
      subscription: subscription
        ? {
            id: subscription.id,
            interval: subscription.interval,
            status: subscription.status,
            current_period_end: subscription.currentPeriodEnd.toISOString(),
            price_cents: subscription.priceCents,
            live,
            plan_name: subscription.plan?.name ?? null,
          }
        : null,
      entitlements: {
        site_limit: siteLimit.limit,
        sites_used: siteLimit.current,
      },
      modules: {
        scheduler: {
          pending_jobs: pendingJobs,
          scheduled_posts: scheduledPosts,
        },
        seo: {
          audits: seoAudits,
          synced_posts: postsTotal,
        },
      },
      pricing: {
        monthly: PLANS.monthly.priceCents,
        yearly: PLANS.yearly.priceCents,
        trial_days: 7,
      },
    },
  });
}
