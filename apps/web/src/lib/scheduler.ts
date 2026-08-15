import { prisma } from "./db";
import { callWordPress } from "./wordpress";

export type WpPost = {
  wp_post_id: number;
  title: string;
  status: string;
  post_type: string;
  permalink: string | null;
  scheduled_at: string | null;
  published_at: string | null;
};

export async function upsertPosts(siteId: string, posts: WpPost[]) {
  for (const post of posts) {
    const scheduledAt = post.scheduled_at ? new Date(post.scheduled_at) : null;
    const publishedAt = post.published_at ? new Date(post.published_at) : null;

    const row = await prisma.editorialPost.upsert({
      where: {
        siteId_wpPostId: {
          siteId,
          wpPostId: post.wp_post_id,
        },
      },
      update: {
        title: post.title,
        status: post.status,
        postType: post.post_type,
        permalink: post.permalink,
        scheduledAt,
        publishedAt,
        syncedAt: new Date(),
      },
      create: {
        siteId,
        wpPostId: post.wp_post_id,
        title: post.title,
        status: post.status,
        postType: post.post_type,
        permalink: post.permalink,
        scheduledAt,
        publishedAt,
      },
    });

    if (post.status === "future" && scheduledAt) {
      await prisma.scheduleJob.deleteMany({
        where: {
          siteId,
          wpPostId: post.wp_post_id,
          status: { in: ["pending", "failed"] },
          action: "publish",
        },
      });
      await prisma.scheduleJob.create({
        data: {
          siteId,
          postId: row.id,
          wpPostId: post.wp_post_id,
          action: "publish",
          runAt: scheduledAt,
          status: "pending",
        },
      });
    }
  }
}

export async function refreshSitePosts(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return;
  }

  const payload = await callWordPress<{ posts: WpPost[] }>({
    restUrl: site.restUrl,
    signingSecret: site.signingSecret,
    method: "GET",
    path: "posts",
  });

  await upsertPosts(site.id, payload.posts ?? []);
  await prisma.site.update({
    where: { id: site.id },
    data: { lastSeenAt: new Date() },
  });
}

export async function processDueJobs(options?: { siteId?: string; limit?: number }) {
  const due = await prisma.scheduleJob.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      runAt: { lte: new Date() },
      attempts: { lt: 8 },
      ...(options?.siteId ? { siteId: options.siteId } : {}),
    },
    include: { site: true },
    orderBy: { runAt: "asc" },
    take: options?.limit ?? 20,
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const job of due) {
    results.push(await executeJob(job.id));
  }

  return results;
}

export async function publishEditorialPost(postId: string) {
  const post = await prisma.editorialPost.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error("المقال غير موجود.");
  }

  const job = await prisma.scheduleJob.create({
    data: {
      siteId: post.siteId,
      postId: post.id,
      wpPostId: post.wpPostId,
      action: "publish",
      runAt: new Date(),
      status: "pending",
    },
  });

  return executeJob(job.id);
}

async function executeJob(jobId: string) {
  const job = await prisma.scheduleJob.findUnique({
    where: { id: jobId },
    include: { site: true },
  });
  if (!job) {
    return { id: jobId, ok: false, error: "missing job" };
  }

  await prisma.scheduleJob.update({
    where: { id: job.id },
    data: { status: "running", attempts: { increment: 1 } },
  });

  try {
    const payload = await callWordPress<{
      ok: boolean;
      post?: WpPost;
    }>({
      restUrl: job.site.restUrl,
      signingSecret: job.site.signingSecret,
      method: "POST",
      path: "publish",
      body: {
        post_id: job.wpPostId,
        action: job.action,
      },
    });

    if (payload.post) {
      await upsertPosts(job.siteId, [payload.post]);
    }

    await prisma.scheduleJob.update({
      where: { id: job.id },
      data: { status: "done", lastError: null },
    });
    await prisma.site.update({
      where: { id: job.siteId },
      data: { lastSeenAt: new Date() },
    });
    return { id: job.id, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.scheduleJob.update({
      where: { id: job.id },
      data: { status: "failed", lastError: message.slice(0, 500) },
    });
    return { id: job.id, ok: false, error: message };
  }
}
