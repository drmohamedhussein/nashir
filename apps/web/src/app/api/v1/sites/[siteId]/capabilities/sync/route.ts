import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readSignedHeaders, verifyPayload } from "@/lib/crypto";

const schema = z.object({
  integrations: z.array(z.record(z.string(), z.unknown())).max(20),
  capabilities: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      integration: z.string(),
    }),
  ).max(200),
});

type Params = { params: Promise<{ siteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
  }

  const body = await request.text();
  const { timestamp, signature } = readSignedHeaders(request);
  if (!verifyPayload(site.signingSecret, timestamp, body, signature)) {
    return NextResponse.json({ error: API_ERRORS.INVALID_SIGNATURE }, { status: 401 });
  }

  const parsed = schema.safeParse(JSON.parse(body || "{}"));
  if (!parsed.success) {
    return NextResponse.json({ error: API_ERRORS.INVALID_PAYLOAD }, { status: 400 });
  }

  await prisma.site.update({
    where: { id: site.id },
    data: {
      integrationsJson: JSON.stringify(parsed.data.integrations),
      capabilitiesJson: JSON.stringify(parsed.data.capabilities),
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
