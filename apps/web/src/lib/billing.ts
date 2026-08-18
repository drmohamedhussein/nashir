/**
 * PayPal Subscriptions billing integration.
 * Falls back to mock checkout when PAYPAL_CLIENT_ID is unset.
 */
import { prisma } from "./db";
import { periodEnd, trialEnd } from "./plans";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const PAYPAL_MODE = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";

export function isPayPalConfigured(): boolean {
  return PAYPAL_CLIENT_ID.length > 10 && PAYPAL_CLIENT_SECRET.length > 10;
}

function paypalBaseUrl(): string {
  return PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function paypalManageUrl(): string {
  return PAYPAL_MODE === "live"
    ? "https://www.paypal.com/myaccount/autopay/"
    : "https://www.sandbox.paypal.com/myaccount/autopay/";
}

function planIdForPlan(planId: string, interval: "monthly" | "yearly"): string | null {
  const envKey = `PAYPAL_PLAN_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  const value = process.env[envKey];
  return typeof value === "string" && value.startsWith("P-") ? value : null;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) {
    throw new Error("PayPal authentication failed");
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPal did not return an access token");
  }
  return data.access_token;
}

type PayPalSubscription = {
  id: string;
  status: string;
  custom_id?: string;
  subscriber?: { payer_id?: string };
};

async function fetchSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  const token = await getAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("PayPal subscription lookup failed");
  }
  return (await response.json()) as PayPalSubscription;
}

function parseCustomId(customId: string | undefined): { workspaceId: string; planId: string; interval: "monthly" | "yearly" } | null {
  if (!customId) {
    return null;
  }
  const [workspaceId, planId, interval] = customId.split("|");
  if (!workspaceId || !planId) {
    return null;
  }
  return {
    workspaceId,
    planId,
    interval: interval === "yearly" ? "yearly" : "monthly",
  };
}

export async function activateSubscriptionFromPayPal(subscriptionId: string): Promise<boolean> {
  if (!isPayPalConfigured()) {
    return false;
  }

  const subscription = await fetchSubscription(subscriptionId);
  if (subscription.status !== "ACTIVE" && subscription.status !== "APPROVED") {
    return false;
  }

  const meta = parseCustomId(subscription.custom_id);
  if (!meta) {
    return false;
  }

  const plan = await prisma.plan.findUnique({ where: { id: meta.planId } });
  const priceCents =
    meta.interval === "yearly" ? plan?.yearlyPriceCents ?? 9900 : plan?.monthlyPriceCents ?? 999;
  const end = periodEnd(meta.interval);
  const paypalPayerId = subscription.subscriber?.payer_id ?? null;

  const existing = await prisma.subscription.findFirst({
    where: { workspaceId: meta.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: meta.planId,
        interval: meta.interval,
        status: "active",
        priceCents,
        paypalPayerId,
        paypalSubscriptionId: subscription.id,
        currentPeriodEnd: end,
        renewalDate: end,
      },
    });
    return true;
  }

  await prisma.subscription.create({
    data: {
      workspaceId: meta.workspaceId,
      planId: meta.planId,
      interval: meta.interval,
      status: "active",
      priceCents,
      paypalPayerId,
      paypalSubscriptionId: subscription.id,
      currentPeriodEnd: end,
      renewalDate: end,
    },
  });
  return true;
}

export async function createCheckoutSession(opts: {
  workspaceId: string;
  planId: string;
  interval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<{ url: string; subscriptionId?: string }> {
  if (!isPayPalConfigured()) {
    return { url: `${opts.successUrl}?subscription_id=mock_${opts.workspaceId}` };
  }

  const paypalPlanId = planIdForPlan(opts.planId, opts.interval);
  if (!paypalPlanId) {
    throw new Error(`Missing PayPal plan for ${opts.planId}/${opts.interval}`);
  }

  const token = await getAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: paypalPlanId,
      custom_id: `${opts.workspaceId}|${opts.planId}|${opts.interval}`,
      subscriber: opts.customerEmail ? { email_address: opts.customerEmail } : undefined,
      application_context: {
        brand_name: "RankPublish",
        user_action: "SUBSCRIBE_NOW",
        return_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("PayPal subscription creation failed");
  }

  const data = (await response.json()) as {
    id?: string;
    links?: Array<{ rel: string; href: string }>;
  };
  const approveUrl = data.links?.find((link) => link.rel === "approve")?.href;
  if (!approveUrl) {
    throw new Error("PayPal did not return an approval URL");
  }

  return { url: approveUrl, subscriptionId: data.id };
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  return { url: paypalManageUrl() };
}

type PayPalWebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
};

export async function handlePayPalWebhook(
  body: string,
  headers: PayPalWebhookHeaders,
): Promise<{ event: string; handled: boolean }> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!isPayPalConfigured() || !webhookId) {
    return { event: "none", handled: false };
  }

  const token = await getAccessToken();
  const verifyResponse = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!verifyResponse.ok) {
    throw new Error("Invalid PayPal webhook signature");
  }

  const verifyData = (await verifyResponse.json()) as { verification_status?: string };
  if (verifyData.verification_status !== "SUCCESS") {
    throw new Error("PayPal webhook verification failed");
  }

  const event = JSON.parse(body) as {
    event_type?: string;
    resource?: { id?: string; billing_agreement_id?: string };
  };
  const eventType = event.event_type ?? "unknown";

  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
      const subscriptionId = event.resource?.id;
      if (subscriptionId) {
        await activateSubscriptionFromPayPal(subscriptionId);
        return { event: eventType, handled: true };
      }
      break;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      const subscriptionId = event.resource?.id;
      if (subscriptionId) {
        const sub = await prisma.subscription.findFirst({ where: { paypalSubscriptionId: subscriptionId } });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "canceled", renewalDate: null },
          });
        }
        return { event: eventType, handled: true };
      }
      break;
    }
    case "PAYMENT.SALE.COMPLETED": {
      const subscriptionId = event.resource?.billing_agreement_id;
      if (subscriptionId) {
        const sub = await prisma.subscription.findFirst({ where: { paypalSubscriptionId: subscriptionId } });
        if (sub) {
          const end = periodEnd(sub.interval as "monthly" | "yearly");
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "active", currentPeriodEnd: end, renewalDate: end },
          });
        }
        return { event: eventType, handled: true };
      }
      break;
    }
    default:
      break;
  }

  return { event: eventType, handled: false };
}

export { trialEnd };
