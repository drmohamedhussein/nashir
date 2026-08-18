import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertMember } from "@/lib/workspace";

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Login required." } }, { status: 401 });
  }

  const { workspaceId } = await params;
  if (workspaceId !== session.workspaceId) {
    await assertMember(session.id, workspaceId);
  }

  const commands = await prisma.command.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      site: { select: { id: true, name: true, url: true } },
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    data: commands.map((row) => ({
      id: row.id,
      siteId: row.siteId,
      siteName: row.site.name,
      capabilityKey: row.capabilityKey,
      status: row.status,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      actor: row.actor,
    })),
  });
}
