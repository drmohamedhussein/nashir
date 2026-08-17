import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callWordPress } from "@/lib/wordpress";

type Params = { params: Promise<{ siteId: string; wpPostId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }

  const { siteId, wpPostId } = await params;
  const postId = Number(wpPostId);
  if (!Number.isFinite(postId) || postId < 1) {
    return NextResponse.json({ error: "معرّف المقال غير صالح." }, { status: 400 });
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site) {
    return NextResponse.json({ error: "الموقع غير موجود." }, { status: 404 });
  }

  if (!site.restUrl.includes("rankpublish/v1")) {
    return NextResponse.json({ error: "الموقع لا يستخدم RankPublish Connector." }, { status: 422 });
  }

  try {
    const result = await callWordPress<{ ok: boolean; post?: Record<string, unknown> }>({
      restUrl: site.restUrl,
      signingSecret: site.signingSecret,
      method: "GET",
      path: `posts/${postId}`,
    });

    if (!result.post) {
      return NextResponse.json({ error: "المقال غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post: result.post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر جلب المقال.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
