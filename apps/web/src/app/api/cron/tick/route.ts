import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { processDueJobs } from "@/lib/scheduler";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 });
  }

  const results = await processDueJobs();
  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function GET(request: Request) {
  return POST(request);
}
