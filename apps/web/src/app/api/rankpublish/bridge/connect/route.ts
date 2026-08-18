import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { digestToken, hashSecret, normalizeOrigin, randomToken, sameDigest } from "@/lib/crypto";
import { logActivity } from "@/lib/commands";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  siteId: z.string().trim().min(1).max(80),
  token: z.string().trim().min(8).max(200),
  siteUrl: z.string().trim().url().max(500),
  wordpressVersion: z.string().trim().max(40).optional(),
});

function originOf(value: string): string | null {
  try {
    return normalizeOrigin(value);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "bridge-connect"), 30, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "siteId, token, and siteUrl are required" }, { status: 400 });
  }

  const siteOrigin = originOf(parsed.data.siteUrl);
  if (!siteOrigin) {
    return NextResponse.json({ ok: false, error: "A valid WordPress site URL is required" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { id: parsed.data.siteId } });
  if (!site || !site.connectionTokenHash || !site.tokenExpiresAt) {
    return NextResponse.json({ ok: false, error: "This connection token is not valid" }, { status: 400 });
  }
  if (site.tokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "This connection token has expired" }, { status: 400 });
  }
  if (!sameDigest(site.connectionTokenHash, parsed.data.token)) {
    return NextResponse.json({ ok: false, error: "This connection token is not valid" }, { status: 400 });
  }
  if (originOf(site.url) !== siteOrigin) {
    return NextResponse.json(
      { ok: false, error: "The WordPress site URL does not match this connection request" },
      { status: 400 },
    );
  }

  const bridgeSecret = `rp_bridge_${randomToken(32)}`;
  const restUrl = site.restUrl.includes("wp-json")
    ? site.restUrl
    : `${siteOrigin}/wp-json/`;

  await prisma.site.update({
    where: { id: site.id },
    data: {
      status: "connected",
      restUrl,
      wpVersion: parsed.data.wordpressVersion?.slice(0, 40) ?? site.wpVersion,
      signingSecret: bridgeSecret,
      apiKeyHash: hashSecret(bridgeSecret),
      bridgeSecretHash: digestToken(bridgeSecret),
      connectionTokenHash: null,
      tokenExpiresAt: null,
      workerStatus: "active",
      workerRef: site.id,
      connectorType: "rankpublish",
      lastSeenAt: new Date(),
    },
  });

  await logActivity({
    workspaceId: site.workspaceId,
    siteId: site.id,
    type: "site.connected",
    title: "Site connected",
    detail: siteOrigin,
    status: "succeeded",
  });

  return NextResponse.json(
    { ok: true, siteId: site.id, bridgeSecret },
    { status: 201 },
  );
}
