import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pairingCode } from "@/lib/crypto";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "pairing"), 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: API_ERRORS.RATE_LIMIT }, { status: 429 });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  await prisma.pairingCode.deleteMany({
    where: { workspaceId: session.workspaceId, expiresAt: { lt: new Date() } },
  });

  const row = await prisma.pairingCode.create({
    data: {
      workspaceId: session.workspaceId,
      code: pairingCode(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  return NextResponse.json({
    code: row.code,
    expiresAt: row.expiresAt.toISOString(),
  });
}
