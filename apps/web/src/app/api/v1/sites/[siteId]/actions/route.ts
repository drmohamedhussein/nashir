import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callWordPress } from "@/lib/wordpress";

const schema = z.object({
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().uuid().optional(),
});

type Params = { params: Promise<{ siteId: string }> };

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

  if (!site.restUrl.includes("rankpublish/v1")) {
    return NextResponse.json({ error: "الموقع لا يستخدم RankPublish Connector." }, { status: 422 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  try {
    const result = await callWordPress<{ ok: boolean; result?: unknown }>({
      restUrl: site.restUrl,
      signingSecret: site.signingSecret,
      method: "POST",
      path: "actions",
      body: {
        action: parsed.data.action,
        payload: parsed.data.payload ?? {},
        idempotency_key: parsed.data.idempotency_key,
      },
    });

    return NextResponse.json({ ok: true, data: result.result ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تنفيذ الإجراء.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
