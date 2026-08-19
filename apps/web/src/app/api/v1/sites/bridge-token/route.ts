import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { digestToken, hashSecret, normalizeOrigin, randomToken } from "@/lib/crypto";
import { publicAppUrl } from "@/lib/environments";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  siteUrl: z.string().trim().url().max(500),
  siteName: z.string().trim().min(1).max(120).optional(),
  siteId: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "bridge-token"), 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: API_ERRORS.RATE_LIMIT }, { status: 429 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: API_ERRORS.SITE_URL_REQUIRED }, { status: 400 });
  }

  let origin: string;
  try {
    origin = normalizeOrigin(parsed.data.siteUrl);
  } catch {
    return NextResponse.json({ error: API_ERRORS.INVALID_WP_URL }, { status: 400 });
  }

  const token = `rp_live_${randomToken(24)}`;
  const placeholderSecret = randomToken(32);
  const name = parsed.data.siteName ?? new URL(origin).hostname;

  const existing = parsed.data.siteId
    ? await prisma.site.findFirst({
        where: { id: parsed.data.siteId, workspaceId: session.workspaceId },
      })
    : await prisma.site.findFirst({
        where: { workspaceId: session.workspaceId, url: origin },
      });

  const site = existing
    ? await prisma.site.update({
        where: { id: existing.id },
        data: {
          name,
          url: origin,
          restUrl: existing.restUrl || `${origin}/wp-json/`,
          connectionTokenHash: digestToken(token),
          tokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          status: "pending",
          workerStatus: "none",
        },
      })
    : await prisma.site.create({
        data: {
          workspaceId: session.workspaceId,
          name,
          url: origin,
          restUrl: `${origin}/wp-json/`,
          apiKeyHash: hashSecret(placeholderSecret),
          signingSecret: placeholderSecret,
          connectionTokenHash: digestToken(token),
          tokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          status: "pending",
          workerStatus: "none",
        },
      });

  const appUrl = publicAppUrl();
  return NextResponse.json({
    siteId: site.id,
    token,
    endpoint: `${appUrl}/api/rankpublish/bridge/connect`,
    expiresAt: site.tokenExpiresAt?.toISOString() ?? null,
  });
}
