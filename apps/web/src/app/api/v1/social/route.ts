import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queueShare } from "@/lib/scheduler";
import { SOCIAL_PLATFORMS } from "@/lib/social";

const connectSchema = z.object({
  siteId: z.string(),
  platform: z.enum(SOCIAL_PLATFORMS),
  label: z.string().trim().min(1).max(80),
  accessToken: z.string().max(2000).optional(),
});

const templateSchema = z.object({
  siteId: z.string(),
  platform: z.enum(SOCIAL_PLATFORMS),
  body: z.string().min(1).max(2000),
});

const shareSchema = z.object({
  siteId: z.string(),
  postId: z.string().optional(),
  platform: z.enum(SOCIAL_PLATFORMS),
  message: z.string().max(2000).optional(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const siteId = new URL(request.url).searchParams.get("siteId");
  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId, ...(siteId ? { id: siteId } : {}) },
    include: { socialAccounts: true, socialTemplates: true, shareJobs: { take: 20, orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({
    platforms: SOCIAL_PLATFORMS,
    sites: sites.map((site) => ({
      id: site.id,
      name: site.name,
      accounts: site.socialAccounts,
      templates: site.socialTemplates,
      jobs: site.shareJobs,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const json = (await request.json().catch(() => null)) as { intent?: string } | null;
  if (!json) {
    return NextResponse.json({ error: API_ERRORS.INVALID_REQUEST }, { status: 400 });
  }

  if (json.intent === "connect") {
    const parsed = connectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: API_ERRORS.INVALID_ACCOUNT }, { status: 400 });
    }
    const site = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, workspaceId: session.workspaceId },
    });
    if (!site) {
      return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
    }
    const account = await prisma.socialAccount.upsert({
      where: {
        siteId_platform_label: {
          siteId: site.id,
          platform: parsed.data.platform,
          label: parsed.data.label,
        },
      },
      update: {
        accessToken: parsed.data.accessToken ?? "",
        connected: Boolean(parsed.data.accessToken),
      },
      create: {
        siteId: site.id,
        platform: parsed.data.platform,
        label: parsed.data.label,
        accessToken: parsed.data.accessToken ?? "",
        connected: Boolean(parsed.data.accessToken),
      },
    });
    return NextResponse.json({ ok: true, account });
  }

  if (json.intent === "template") {
    const parsed = templateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: API_ERRORS.INVALID_TEMPLATE }, { status: 400 });
    }
    const site = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, workspaceId: session.workspaceId },
    });
    if (!site) {
      return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
    }
    const template = await prisma.socialTemplate.upsert({
      where: { siteId_platform: { siteId: site.id, platform: parsed.data.platform } },
      update: { body: parsed.data.body },
      create: { siteId: site.id, platform: parsed.data.platform, body: parsed.data.body },
    });
    return NextResponse.json({ ok: true, template });
  }

  if (json.intent === "share") {
    const parsed = shareSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: API_ERRORS.INVALID_SHARE }, { status: 400 });
    }
    const site = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, workspaceId: session.workspaceId },
    });
    if (!site) {
      return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
    }
    const job = await queueShare(parsed.data);
    return NextResponse.json({ ok: true, job });
  }

  return NextResponse.json({ error: API_ERRORS.UNKNOWN_INTENT }, { status: 400 });
}
