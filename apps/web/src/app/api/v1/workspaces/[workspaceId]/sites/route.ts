import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { assertMember, createSiteInWorkspace, disconnectSite, regenerateSiteToken } from "@/lib/workspace";
import { checkSiteLimit } from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    await assertMember(session.id, workspaceId);
    const sites = await prisma.site.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, url: true, status: true,
        workerStatus: true, wpVersion: true, lastSeenAt: true, createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, data: sites });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url().max(500),
});

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Name and valid URL are required" }, { status: 400 });
    }

    const siteCheck = await checkSiteLimit(workspaceId);
    if (!siteCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: `Site limit reached (${siteCheck.current}/${siteCheck.limit}). Upgrade your plan.` },
        { status: 403 },
      );
    }

    const result = await createSiteInWorkspace(session.id, workspaceId, parsed.data);
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create site";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
