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
    const siteId = url.searchParams.get("siteId");

    const where: Record<string, unknown> = { site: { workspaceId } };
    if (siteId) {
      where.siteId = siteId;
    }

    const posts = await prisma.editorialPost.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true, title: true, siteId: true, status: true,
        scheduledAt: true, seoTitle: true, metaDescription: true,
        keywords: true, updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}
