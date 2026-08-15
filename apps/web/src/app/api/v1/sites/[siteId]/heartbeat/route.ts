import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayload } from "@/lib/crypto";
import { processDueJobs, refreshSitePosts } from "@/lib/scheduler";

type Params = { params: Promise<{ siteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ error: "الموقع غير موجود." }, { status: 404 });
  }

  const body = await request.text();
  const timestamp = request.headers.get("x-nashir-timestamp") ?? "";
  const signature = request.headers.get("x-nashir-signature") ?? "";
  if (!verifyPayload(site.signingSecret, timestamp, body || "{}", signature)) {
    return NextResponse.json({ error: "توقيع غير صالح." }, { status: 401 });
  }

  const jobs = await processDueJobs({ siteId: site.id, limit: 10 });
  try {
    await refreshSitePosts(site.id);
  } catch {
    // Heartbeat still succeeds if publish jobs ran; sync can retry next minute.
  }

  return NextResponse.json({ ok: true, jobs: jobs.length });
}
