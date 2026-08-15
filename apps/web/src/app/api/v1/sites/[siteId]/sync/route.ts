import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPayload } from "@/lib/crypto";
import { upsertPosts } from "@/lib/scheduler";

const postSchema = z.object({
  wp_post_id: z.number().int().positive(),
  title: z.string(),
  status: z.string(),
  post_type: z.string(),
  permalink: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});

const schema = z.object({
  posts: z.array(postSchema).max(200),
});

type Params = { params: Promise<{ siteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ error: "الموقع غير موجود." }, { status: 404 });
  }

  const body = await request.text();
  const timestamp = request.headers.get("x-nashir-timestamp") ?? "";
  const signature = request.headers.get("x-nashir-signature") ?? "";

  if (!verifyPayload(site.signingSecret, timestamp, body, signature)) {
    return NextResponse.json({ error: "توقيع غير صالح." }, { status: 401 });
  }

  const parsed = schema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات المزامنة غير صالحة." }, { status: 400 });
  }

  await upsertPosts(
    site.id,
    parsed.data.posts.map((post) => ({
      wp_post_id: post.wp_post_id,
      title: post.title,
      status: post.status,
      post_type: post.post_type,
      permalink: post.permalink ?? null,
      scheduled_at: post.scheduled_at ?? null,
      published_at: post.published_at ?? null,
    })),
  );

  await prisma.site.update({
    where: { id: site.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
