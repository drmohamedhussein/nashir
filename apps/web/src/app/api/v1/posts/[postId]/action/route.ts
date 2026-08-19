import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queuePostAction } from "@/lib/scheduler";

const schema = z.object({
  action: z.enum(["publish", "unpublish", "republish", "schedule", "advanced", "publish_keep_date"]),
  datetime: z.string().datetime().optional(),
});

type Params = { params: Promise<{ postId: string }> };

export async function POST(request: Request, { params }: Params) {
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

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: API_ERRORS.INVALID_ACTION }, { status: 400 });
  }

  const runAt = parsed.data.datetime ? new Date(parsed.data.datetime) : new Date();
  const result = await queuePostAction({
    postId: post.id,
    action: parsed.data.action,
    runAt,
    datetime: parsed.data.datetime,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? API_ERRORS.ACTION_FAILED }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
