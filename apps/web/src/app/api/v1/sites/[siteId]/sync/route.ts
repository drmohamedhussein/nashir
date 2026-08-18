import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPayload, readSignedHeaders } from "@/lib/crypto";
import { logActivity } from "@/lib/commands";
import { upsertPosts } from "@/lib/scheduler";

const postSchema = z.object({
  wp_post_id: z.number().int().positive(),
  title: z.string(),
  status: z.string(),
  post_type: z.string(),
  permalink: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  scheduled_at: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  unpublish_at: z.string().nullable().optional(),
  republish_at: z.string().nullable().optional(),
  advanced_at: z.string().nullable().optional(),
});

const schema = z.object({
  posts: z.array(postSchema).max(200),
  cursor: z.string().optional(),
});

type Params = { params: Promise<{ siteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Site not found." } }, { status: 404 });
  }

  const body = await request.text();
  const { timestamp, signature } = readSignedHeaders(request);

  if (!verifyPayload(site.signingSecret, timestamp, body, signature)) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_SIGNATURE", message: "Invalid signature." } }, { status: 401 });
  }

  const parsed = schema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid sync payload." } }, { status: 400 });
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

  const now = new Date();
  await prisma.$transaction([
    prisma.site.update({
      where: { id: site.id },
      data: {
        lastSeenAt: now,
        workerStatus: site.workerStatus === "provisioning" ? "active" : site.workerStatus,
        workerRef: site.workerRef ?? site.id,
        connectorType: "rankpublish",
      },
    }),
    prisma.syncState.upsert({
      where: { siteId: site.id },
      create: {
        siteId: site.id,
        lastPostSyncAt: now,
        postSyncCursor: parsed.data.cursor ?? null,
      },
      update: {
        lastPostSyncAt: now,
        postSyncCursor: parsed.data.cursor ?? undefined,
      },
    }),
  ]);

  await logActivity({
    workspaceId: site.workspaceId,
    siteId: site.id,
    type: "sync.posts",
    title: "Posts synced",
    detail: `${parsed.data.posts.length} posts`,
    status: "succeeded",
  });

  return NextResponse.json({ ok: true, data: { synced: parsed.data.posts.length } });
}
