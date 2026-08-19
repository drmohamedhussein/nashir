import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callWordPress } from "@/lib/wordpress";

type Params = { params: Promise<{ siteId: string; wpPostId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const { siteId, wpPostId } = await params;
  const postId = Number(wpPostId);
  if (!Number.isFinite(postId) || postId < 1) {
    return NextResponse.json({ error: API_ERRORS.INVALID_POST_ID }, { status: 400 });
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site) {
    return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
  }

  if (!site.restUrl.includes("rankpublish/v1")) {
    return NextResponse.json({ error: API_ERRORS.CONNECTOR_REQUIRED }, { status: 422 });
  }

  try {
    const result = await callWordPress<{ ok: boolean; post?: Record<string, unknown> }>({
      restUrl: site.restUrl,
      signingSecret: site.signingSecret,
      method: "GET",
      path: `posts/${postId}`,
    });

    if (!result.post) {
      return NextResponse.json({ error: API_ERRORS.POST_NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post: result.post });
  } catch (error) {
    const message = error instanceof Error ? error.message : API_ERRORS.FETCH_POST_FAILED;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
