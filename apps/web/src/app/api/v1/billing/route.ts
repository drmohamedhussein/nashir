import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  activateSubscriptionFromPayPal,
  createBillingPortalSession,
  createCheckoutSession,
  isPayPalConfigured,
  trialEnd,
} from "@/lib/billing";
import { SEED_PLANS } from "@/lib/plans";
import { appUrl } from "@/lib/env";

const checkoutSchema = z.object({
  planId: z.literal("starter").default("starter"),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

const trialSchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  planId: z.literal("starter").default("starter"),
});

const captureSchema = z.object({
  subscriptionId: z.string().min(1),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Login required." } }, { status: 401 });
  }

  const [subscriptions, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: { workspaceId: session.workspaceId },
      include: { site: true, plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ where: { isActive: true }, include: { entitlements: true }, orderBy: { monthlyPriceCents: "asc" } }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      paypalConfigured: isPayPalConfigured(),
      plans: plans.length ? plans : SEED_PLANS,
      subscriptions: subscriptions.map((row) => ({
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
        paypalPayerId: row.paypalPayerId,
        paypalSubscriptionId: row.paypalSubscriptionId,
      })),
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Login required." } }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const action = typeof json.action === "string" ? json.action : "trial";

  if (action === "checkout") {
    const parsed = checkoutSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid checkout request." } }, { status: 400 });
    }

    const app = appUrl();
    try {
      const checkout = await createCheckoutSession({
        workspaceId: session.workspaceId,
        planId: parsed.data.planId,
        interval: parsed.data.interval,
        successUrl: `${app}/app/billing?checkout=success`,
        cancelUrl: `${app}/app/billing?checkout=cancel`,
        customerEmail: session.email,
      });
      return NextResponse.json({ ok: true, data: { url: checkout.url } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout unavailable";
      return NextResponse.json({ ok: false, error: { code: "CHECKOUT_FAILED", message } }, { status: 502 });
    }
  }

  if (action === "capture") {
    const parsed = captureSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST", message: "subscriptionId required." } }, { status: 400 });
    }
    if (parsed.data.subscriptionId.startsWith("mock_")) {
      return NextResponse.json({ ok: true, data: { mock: true } });
    }
    try {
      const activated = await activateSubscriptionFromPayPal(parsed.data.subscriptionId);
      return NextResponse.json({ ok: true, data: { activated } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Capture failed";
      return NextResponse.json({ ok: false, error: { code: "CAPTURE_FAILED", message } }, { status: 502 });
    }
  }

  if (action === "portal") {
    const sub = await prisma.subscription.findFirst({
      where: { workspaceId: session.workspaceId, paypalSubscriptionId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (!sub?.paypalSubscriptionId) {
      return NextResponse.json({ ok: false, error: { code: "NO_CUSTOMER", message: "No PayPal subscription on file." } }, { status: 404 });
    }
    const portal = await createBillingPortalSession();
    return NextResponse.json({ ok: true, data: { url: portal.url } });
  }

  const parsed = trialSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid trial request." } }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
  const priceCents =
    parsed.data.interval === "yearly" ? plan?.yearlyPriceCents ?? 9900 : plan?.monthlyPriceCents ?? 999;

  const seat = await prisma.subscription.create({
    data: {
      workspaceId: session.workspaceId,
      planId: parsed.data.planId,
      interval: parsed.data.interval,
      status: "trial",
      priceCents,
      currentPeriodEnd: trialEnd(),
    },
  });

  return NextResponse.json({ ok: true, data: { id: seat.id } });
}
