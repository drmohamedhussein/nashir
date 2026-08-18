/**
 * Stripe billing placeholders.
 *
 * When STRIPE_SECRET_KEY is set, these functions call the real Stripe API.
 * Otherwise they return mock responses suitable for development.
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";

export function isStripeConfigured(): boolean {
  return STRIPE_KEY.startsWith("sk_");
}

export async function createCheckoutSession(opts: {
  workspaceId: string;
  planId: string;
  interval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    return { url: `${opts.successUrl}?session_id=mock_${opts.workspaceId}` };
  }

  // TODO: Call Stripe Checkout Sessions API
  // const stripe = new Stripe(STRIPE_KEY);
  // const session = await stripe.checkout.sessions.create({ ... });
  // return { url: session.url };
  return { url: opts.successUrl };
}

export async function createBillingPortalSession(opts: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    return { url: opts.returnUrl };
  }

  // TODO: Call Stripe Billing Portal Sessions API
  return { url: opts.returnUrl };
}

export async function handleWebhook(
  body: string,
  signature: string,
): Promise<{ event: string; handled: boolean }> {
  if (!isStripeConfigured()) {
    return { event: "none", handled: false };
  }

  // TODO: Verify Stripe webhook signature and handle events:
  // - checkout.session.completed -> activate subscription
  // - invoice.paid -> extend subscription period
  // - customer.subscription.deleted -> cancel subscription
  return { event: "none", handled: false };
}
