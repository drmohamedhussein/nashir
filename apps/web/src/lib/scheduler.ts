import { prisma } from "./db";
import { callWordPress } from "./wordpress";
import { DEFAULT_TEMPLATES, renderTemplate, type SocialPlatform } from "./social";
import { API_ERRORS } from "./api-errors";

export type WpPost = {
  wp_post_id: number;
  title: string;
  status: string;
  post_type: string;
  permalink: string | null;
  excerpt?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  keywords?: string[];
  scheduled_at: string | null;
  published_at: string | null;
  unpublish_at?: string | null;
  republish_at?: string | null;
  advanced_at?: string | null;
};

export const WP_ACTIONS = ["publish", "unpublish", "republish", "schedule", "advanced", "publish_keep_date"] as const;

export async function upsertPosts(siteId: string, posts: WpPost[]) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });

  for (const post of posts) {
    const scheduledAt = post.scheduled_at ? new Date(post.scheduled_at) : null;
    const publishedAt = post.published_at ? new Date(post.published_at) : null;
    const unpublishAt = post.unpublish_at ? new Date(post.unpublish_at) : null;
    const republishAt = post.republish_at ? new Date(post.republish_at) : null;
    const advancedAt = post.advanced_at ? new Date(post.advanced_at) : null;

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
        excerpt: post.excerpt ?? undefined,
        seoTitle: post.seo_title ?? undefined,
        metaDescription: post.meta_description ?? undefined,
        keywords: post.keywords ? JSON.stringify(post.keywords) : undefined,
        scheduledAt,
        publishedAt,
        unpublishAt,
        republishAt,
        advancedAt,
        syncedAt: new Date(),
      },
      create: {
        siteId,
        wpPostId: post.wp_post_id,
        title: post.title,
        status: post.status,
        postType: post.post_type,
        permalink: post.permalink,
        excerpt: post.excerpt ?? null,
        seoTitle: post.seo_title ?? null,
        metaDescription: post.meta_description ?? null,
        keywords: post.keywords ? JSON.stringify(post.keywords) : "[]",
        scheduledAt,
        publishedAt,
        unpublishAt,
        republishAt,
        advancedAt,
      },
    });

    await syncActionJob(siteId, row.id, post.wp_post_id, "publish", scheduledAt, post.status === "future");
    await syncActionJob(siteId, row.id, post.wp_post_id, "unpublish", unpublishAt, Boolean(unpublishAt));
    await syncActionJob(siteId, row.id, post.wp_post_id, "republish", republishAt, Boolean(republishAt));
    await syncActionJob(siteId, row.id, post.wp_post_id, "advanced", advancedAt, Boolean(advancedAt));

    if (site && post.status === "draft" && !scheduledAt) {
      await maybeAutoSchedule(site, row.id, post.wp_post_id);
    }
  }
}

async function syncActionJob(
  siteId: string,
  postId: string,
  wpPostId: number,
  action: string,
  runAt: Date | null,
  enabled: boolean,
) {
  await prisma.scheduleJob.deleteMany({
    where: {
      siteId,
      wpPostId,
      action,
      status: { in: ["pending", "failed"] },
    },
  });

  if (!enabled || !runAt) {
    return;
  }

  await prisma.scheduleJob.create({
    data: {
      siteId,
      postId,
      wpPostId,
      action,
      runAt,
      status: "pending",
    },
  });
}

async function maybeAutoSchedule(
  site: { id: string; schedulerMode: string; autoIntervalMin: number; weekSlots: string },
  postId: string,
  wpPostId: number,
) {
  if (site.schedulerMode !== "auto" && site.schedulerMode !== "manual") {
    return;
  }

  const existing = await prisma.scheduleJob.findFirst({
    where: { siteId: site.id, wpPostId, action: "schedule", status: { in: ["pending", "running"] } },
  });
  if (existing) {
    return;
  }

  const runAt = nextSlot(site);
  if (!runAt) {
    return;
  }

  await prisma.scheduleJob.create({
    data: {
      siteId: site.id,
      postId,
      wpPostId,
      action: "schedule",
      runAt,
      status: "pending",
    },
  });
}

export function nextSlot(site: { schedulerMode: string; autoIntervalMin: number; weekSlots: string }): Date | null {
  const now = new Date();

  if (site.schedulerMode === "auto") {
    const minutes = Math.max(15, site.autoIntervalMin || 60);
    const last = new Date(now.getTime() + minutes * 60 * 1000);
    return last;
  }

  let slots: Record<string, string[]> = {};
  try {
    slots = JSON.parse(site.weekSlots || "{}") as Record<string, string[]>;
  } catch {
    return null;
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + dayOffset);
    const weekday = String(candidate.getDay());
    const hours = slots[weekday] ?? [];
    for (const hhmm of hours) {
      const [hour, minute] = hhmm.split(":").map((part) => Number(part));
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        continue;
      }
      const slot = new Date(candidate);
      slot.setHours(hour, minute, 0, 0);
      if (slot > now) {
        return slot;
      }
    }
  }

  return null;
}

export async function refreshSitePosts(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return;
  }
  if (isCloudUnreachableWpUrl(site.restUrl) || isCloudUnreachableWpUrl(site.url)) {
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

export function isCloudUnreachableWpUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return true;
  }
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

  const social = await processDueShareJobs(options);
  return [...results, ...social];
}

export async function queuePostAction(input: {
  postId: string;
  action: (typeof WP_ACTIONS)[number];
  runAt?: Date;
  datetime?: string;
}) {
  const post = await prisma.editorialPost.findUnique({ where: { id: input.postId } });
  if (!post) {
    throw new Error(API_ERRORS.POST_NOT_FOUND);
  }

  const job = await prisma.scheduleJob.create({
    data: {
      siteId: post.siteId,
      postId: post.id,
      wpPostId: post.wpPostId,
      action: input.action,
      runAt: input.runAt ?? new Date(),
      status: "pending",
    },
  });

  if (input.datetime) {
    await prisma.editorialPost.update({
      where: { id: post.id },
      data:
        input.action === "unpublish"
          ? { unpublishAt: new Date(input.datetime) }
          : input.action === "republish"
            ? { republishAt: new Date(input.datetime) }
            : input.action === "advanced"
              ? { advancedAt: new Date(input.datetime) }
              : { scheduledAt: new Date(input.datetime) },
    });
  }

  return executeJob(job.id);
}

export async function publishEditorialPost(postId: string) {
  return queuePostAction({ postId, action: "publish" });
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
    const path =
      job.action === "unpublish"
        ? "unpublish"
        : job.action === "republish"
          ? "republish"
          : job.action === "advanced"
            ? "advanced"
            : job.action === "schedule"
              ? "schedule"
              : "publish";

    const payload = await callWordPress<{
      ok: boolean;
      post?: WpPost;
    }>({
      restUrl: job.site.restUrl,
      signingSecret: job.site.signingSecret,
      method: "POST",
      path,
      body: {
        post_id: job.wpPostId,
        action: job.action,
        datetime: job.runAt.toISOString(),
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

export async function queueShare(input: {
  siteId: string;
  postId?: string;
  platform: SocialPlatform;
  message?: string;
  runAt?: Date;
}) {
  const post = input.postId
    ? await prisma.editorialPost.findUnique({ where: { id: input.postId } })
    : null;

  const templateRow = await prisma.socialTemplate.findUnique({
    where: { siteId_platform: { siteId: input.siteId, platform: input.platform } },
  });
  const template = templateRow?.body ?? DEFAULT_TEMPLATES[input.platform];
  const message =
    input.message ??
    renderTemplate(template, {
      title: post?.title ?? "",
      url: post?.permalink ?? "",
    });

  return prisma.socialShareJob.create({
    data: {
      siteId: input.siteId,
      postId: post?.id,
      platform: input.platform,
      message,
      runAt: input.runAt ?? new Date(),
      status: "pending",
    },
  });
}

async function processDueShareJobs(options?: { siteId?: string; limit?: number }) {
  const due = await prisma.socialShareJob.findMany({
    where: {
      status: "pending",
      runAt: { lte: new Date() },
      ...(options?.siteId ? { siteId: options.siteId } : {}),
    },
    include: { site: { include: { socialAccounts: true } } },
    take: options?.limit ?? 10,
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const job of due) {
    const account = job.site.socialAccounts.find((row) => row.platform === job.platform && row.connected);
    if (!account) {
      await prisma.socialShareJob.update({
        where: { id: job.id },
        data: { status: "failed", lastError: API_ERRORS.SOCIAL_ACCOUNT_MISSING },
      });
      results.push({ id: job.id, ok: false, error: "no account" });
      continue;
    }

    await prisma.socialShareJob.update({
      where: { id: job.id },
      data: { status: "done", lastError: null },
    });
    results.push({ id: job.id, ok: true });
  }

  return results;
}
