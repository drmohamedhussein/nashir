import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishEditorialPost } from "@/lib/scheduler";

type Params = { params: Promise<{ postId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const { postId } = await params;
  const post = await prisma.editorialPost.findFirst({
    where: { id: postId, site: { workspaceId: session.workspaceId } },
  });
  if (!post) {
    return NextResponse.json({ error: API_ERRORS.POST_NOT_FOUND }, { status: 404 });
  }

  const result = await publishEditorialPost(post.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? API_ERRORS.PUBLISH_FAILED }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
