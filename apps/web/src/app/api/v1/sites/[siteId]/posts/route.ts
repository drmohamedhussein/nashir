import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callWordPress } from "@/lib/wordpress";

type Params = { params: Promise<{ siteId: string }> };

type PostBrief = {
  wp_post_id: number;
  title: string;
  status: string;
  post_type: string;
  permalink: string | null;
  scheduled_at: string | null;
  published_at: string | null;
};

export async function GET(request: Request, { params }: Params) {
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

  const url = new URL(request.url);
  const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get("per_page") ?? "50") || 50));

  try {
    const result = await callWordPress<{ ok: boolean; posts?: PostBrief[] }>({
      restUrl: site.restUrl,
      signingSecret: site.signingSecret,
      method: "GET",
      path: `posts?per_page=${perPage}`,
    });

    return NextResponse.json({ ok: true, posts: result.posts ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر جلب المقالات.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
