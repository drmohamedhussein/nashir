import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getWorkspaceSummary } from "@/lib/workspace";

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    const summary = await getWorkspaceSummary(session.id, workspaceId);
    return NextResponse.json({ ok: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    const status = message.includes("Access denied") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
