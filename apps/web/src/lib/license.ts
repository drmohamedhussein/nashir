import { prisma } from "./db";
import { hashSecret, randomToken, verifyPassword } from "./crypto";
import { isSubscriptionLive, PLANS, trialEnd } from "./plans";
import { API_ERRORS } from "./api-errors";

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export class LicenseError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function activateByLogin(input: {
  email: string;
  password: string;
  site_url: string;
  site_name: string;
  rest_url: string;
  wp_version?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { workspace: true },
  });
  if (!user?.workspace || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new LicenseError(API_ERRORS.INVALID_CREDENTIALS, 401);
  }

  const workspaceId = user.workspace.id;
  const url = normalizeUrl(input.site_url);

  const existingSite = await prisma.site.findUnique({
    where: { workspaceId_url: { workspaceId, url } },
    include: { subscription: true },
  });

  const subscriptions = await prisma.subscription.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  let seat = existingSite?.subscription ?? null;
  if (seat && !isSubscriptionLive(seat.status, seat.currentPeriodEnd)) {
    seat = null;
  }

  if (!seat) {
    seat =
      subscriptions.find((row) => !row.siteId && isSubscriptionLive(row.status, row.currentPeriodEnd)) ??
      null;
  }

  if (!seat && subscriptions.length === 0) {
    seat = await prisma.subscription.create({
      data: {
        workspaceId,
        interval: PLANS.monthly.interval,
        status: "trial",
        priceCents: PLANS.monthly.priceCents,
        currentPeriodEnd: trialEnd(),
      },
    });
  }

  if (!seat) {
    throw new LicenseError(API_ERRORS.NO_SEAT, 402);
  }

  const apiKey = randomToken(24);
  const signingSecret = randomToken(32);

  const site = await prisma.site.upsert({
    where: { workspaceId_url: { workspaceId, url } },
    update: {
      name: input.site_name,
      restUrl: input.rest_url,
      wpVersion: input.wp_version,
      apiKeyHash: hashSecret(apiKey),
      signingSecret,
      status: "connected",
      lastSeenAt: new Date(),
    },
    create: {
      workspaceId,
      name: input.site_name,
      url,
      restUrl: input.rest_url,
      wpVersion: input.wp_version,
      apiKeyHash: hashSecret(apiKey),
      signingSecret,
      status: "connected",
      lastSeenAt: new Date(),
    },
  });

  if (seat.siteId && seat.siteId !== site.id) {
    await prisma.site.update({
      where: { id: seat.siteId },
      data: { status: "unbound" },
    });
  }

  await prisma.subscription.update({
    where: { id: seat.id },
    data: { siteId: site.id },
  });

  return {
    site_id: site.id,
    api_key: apiKey,
    signing_secret: signingSecret,
    plan: {
      interval: seat.interval,
      status: seat.status,
      current_period_end: seat.currentPeriodEnd.toISOString(),
      price_cents: seat.priceCents,
    },
  };
}

export async function unbindSeat(workspaceId: string, subscriptionId: string) {
  const seat = await prisma.subscription.findFirst({
    where: { id: subscriptionId, workspaceId },
  });
  if (!seat) {
    throw new LicenseError(API_ERRORS.SUBSCRIPTION_NOT_FOUND, 404);
  }

  if (seat.siteId) {
    await prisma.site.update({
      where: { id: seat.siteId },
      data: { status: "unbound" },
    });
  }

  await prisma.subscription.update({
    where: { id: seat.id },
    data: { siteId: null },
  });

  return { ok: true };
}
