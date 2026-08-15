import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashSecret, randomToken } from "@/lib/crypto";

const schema = z.object({
  code: z.string().trim().min(6).max(6),
  site_url: z.string().url(),
  site_name: z.string().trim().min(1).max(120),
  rest_url: z.string().url(),
  wp_version: z.string().max(20).optional(),
});

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "طلب الربط غير صالح." }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const pairing = await prisma.pairingCode.findUnique({ where: { code } });
  if (!pairing || pairing.usedAt || pairing.expiresAt < new Date()) {
    return NextResponse.json({ error: "رمز الربط منتهٍ أو غير صحيح." }, { status: 400 });
  }

  const url = normalizeUrl(parsed.data.site_url);
  const apiKey = randomToken(24);
  const signingSecret = randomToken(32);

  const site = await prisma.site.upsert({
    where: {
      workspaceId_url: {
        workspaceId: pairing.workspaceId,
        url,
      },
    },
    update: {
      name: parsed.data.site_name,
      restUrl: parsed.data.rest_url,
      wpVersion: parsed.data.wp_version,
      apiKeyHash: hashSecret(apiKey),
      signingSecret,
      status: "connected",
      lastSeenAt: new Date(),
    },
    create: {
      workspaceId: pairing.workspaceId,
      name: parsed.data.site_name,
      url,
      restUrl: parsed.data.rest_url,
      wpVersion: parsed.data.wp_version,
      apiKeyHash: hashSecret(apiKey),
      signingSecret,
      status: "connected",
      lastSeenAt: new Date(),
    },
  });

  await prisma.pairingCode.update({
    where: { id: pairing.id },
    data: { usedAt: new Date(), siteId: site.id },
  });

  return NextResponse.json({
    site_id: site.id,
    api_key: apiKey,
    signing_secret: signingSecret,
  });
}
