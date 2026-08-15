import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ siteId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }

  const { siteId } = await params;
  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site) {
    return NextResponse.json({ error: "الموقع غير موجود." }, { status: 404 });
  }

  await prisma.site.delete({ where: { id: site.id } });
  return NextResponse.json({ ok: true });
}
