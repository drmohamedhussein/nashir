import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPayload, readSignedHeaders } from "@/lib/crypto";
import { upsertPosts } from "@/lib/scheduler";

const postSchema = z.object({
  wp_post_id: z.number().int().positive(),
  title: z.string(),
  status: z.string(),
  post_type: z.string(),
  permalink: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  unpublish_at: z.string().nullable().optional(),
  republish_at: z.string().nullable().optional(),
  advanced_at: z.string().nullable().optional(),
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
  const { timestamp, signature } = readSignedHeaders(request);

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
      unpublish_at: post.unpublish_at ?? null,
      republish_at: post.republish_at ?? null,
      advanced_at: post.advanced_at ?? null,
    })),
  );

  await prisma.site.update({
    where: { id: site.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
