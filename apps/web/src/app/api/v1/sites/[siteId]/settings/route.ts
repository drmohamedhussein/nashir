import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  schedulerMode: z.enum(["off", "auto", "manual"]).optional(),
  autoIntervalMin: z.number().int().min(15).max(7 * 24 * 60).optional(),
  weekSlots: z.record(z.string(), z.array(z.string())).optional(),
  allowedTypes: z.string().max(200).optional(),
});

type Params = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, { params }: Params) {
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
  return NextResponse.json(site);
}

export async function POST(request: Request, { params }: Params) {
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

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "إعدادات غير صالحة." }, { status: 400 });
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      schedulerMode: parsed.data.schedulerMode ?? site.schedulerMode,
      autoIntervalMin: parsed.data.autoIntervalMin ?? site.autoIntervalMin,
      weekSlots: parsed.data.weekSlots ? JSON.stringify(parsed.data.weekSlots) : site.weekSlots,
      allowedTypes: parsed.data.allowedTypes ?? site.allowedTypes,
    },
  });

  return NextResponse.json({ ok: true, site: updated });
}
