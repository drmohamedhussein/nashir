import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayload, readSignedHeaders } from "@/lib/crypto";
import { processDueJobs, refreshSitePosts } from "@/lib/scheduler";
import { API_ERRORS } from "@/lib/api-errors";

type Params = { params: Promise<{ siteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
  }

  const body = await request.text();
  const { timestamp, signature } = readSignedHeaders(request);
  if (!verifyPayload(site.signingSecret, timestamp, body || "{}", signature)) {
    return NextResponse.json({ error: API_ERRORS.INVALID_SIGNATURE }, { status: 401 });
  }

  const jobs = await processDueJobs({ siteId: site.id, limit: 10 });
  try {
    await refreshSitePosts(site.id);
  } catch {
    // Local or unreachable WordPress sites push posts via /sync instead.
  }

  await prisma.site.update({
    where: { id: site.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true, jobs: jobs.length });
}
