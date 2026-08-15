import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishEditorialPost } from "@/lib/scheduler";

type Params = { params: Promise<{ postId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }

  const { postId } = await params;
  const post = await prisma.editorialPost.findFirst({
    where: { id: postId, site: { workspaceId: session.workspaceId } },
  });
  if (!post) {
    return NextResponse.json({ error: "المقال غير موجود." }, { status: 404 });
  }

  const result = await publishEditorialPost(post.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "تعذر النشر." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
