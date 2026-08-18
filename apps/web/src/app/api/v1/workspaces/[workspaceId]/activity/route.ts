import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { assertMember } from "@/lib/workspace";
import { prisma } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    await assertMember(session.id, workspaceId);

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    const events = await prisma.activityEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, type: true, title: true, detail: true,
        status: true, siteId: true, createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}
