/**
 * Stripe billing integration.
 * Falls back to mock checkout when STRIPE_SECRET_KEY is unset.
 */
import Stripe from "stripe";
import { prisma } from "./db";
import { periodEnd, trialEnd } from "./plans";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";

export function isStripeConfigured(): boolean {
  return STRIPE_KEY.startsWith("sk_");
}

function stripeClient(): Stripe | null {
  if (!isStripeConfigured()) {
    return null;
  }
  return new Stripe(STRIPE_KEY);
}

function priceIdForPlan(planId: string, interval: "monthly" | "yearly"): string | null {
  const envKey = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  const value = process.env[envKey];
  return typeof value === "string" && value.startsWith("price_") ? value : null;
}

export async function createCheckoutSession(opts: {
  workspaceId: string;
  planId: string;
  interval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<{ url: string; sessionId?: string }> {
  const stripe = stripeClient();
  if (!stripe) {
    return { url: `${opts.successUrl}?session_id=mock_${opts.workspaceId}` };
  }

  const priceId = priceIdForPlan(opts.planId, opts.interval);
  if (!priceId) {
    throw new Error(`Missing Stripe price for ${opts.planId}/${opts.interval}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: {
      workspaceId: opts.workspaceId,
      planId: opts.planId,
      interval: opts.interval,
    },
    subscription_data: {
      metadata: {
        workspaceId: opts.workspaceId,
        planId: opts.planId,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url, sessionId: session.id };
}

export async function createBillingPortalSession(opts: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = stripeClient();
  if (!stripe) {
    return { url: opts.returnUrl };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: opts.returnUrl,
  });

  return { url: session.url };
}

async function activateSubscriptionFromCheckout(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const planId = session.metadata?.planId;
  const interval = (session.metadata?.interval as "monthly" | "yearly" | undefined) ?? "monthly";
  if (!workspaceId || !planId) {
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const priceCents = interval === "yearly" ? plan?.yearlyPriceCents ?? 9900 : plan?.monthlyPriceCents ?? 990;
  const end = periodEnd(interval);

  const existing = await prisma.subscription.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const stripeCustomerId = typeof session.customer === "string" ? session.customer : undefined;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : undefined;

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId,
        interval,
        status: "active",
        priceCents,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodEnd: end,
        renewalDate: end,
      },
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      workspaceId,
      planId,
      interval,
      status: "active",
      priceCents,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd: end,
      renewalDate: end,
    },
  });
}

export async function handleWebhook(body: string, signature: string): Promise<{ event: string; handled: boolean }> {
  const stripe = stripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return { event: "none", handled: false };
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    throw new Error("Invalid Stripe webhook signature");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      await activateSubscriptionFromCheckout(event.data.object as Stripe.Checkout.Session);
      return { event: event.type, handled: true };
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (!subscriptionId) {
        break;
      }
      const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
      if (!sub) {
        break;
      }
      const end = periodEnd(sub.interval as "monthly" | "yearly");
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "active", currentPeriodEnd: end, renewalDate: end },
      });
      return { event: event.type, handled: true };
    }
    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "canceled", renewalDate: null },
        });
      }
      return { event: event.type, handled: true };
    }
    default:
      break;
  }

  return { event: event.type, handled: false };
}

export { trialEnd };
