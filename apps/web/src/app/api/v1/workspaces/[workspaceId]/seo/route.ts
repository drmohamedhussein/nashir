import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { assertMember } from "@/lib/workspace";
import { checkEntitlement } from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    await assertMember(session.id, workspaceId);

    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");
    if (!postId) {
      return NextResponse.json({ ok: false, error: "postId is required" }, { status: 400 });
    }

    const audit = await prisma.seoAudit.findFirst({
      where: { postId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}

const auditSchema = z.object({
  postId: z.string().min(1),
  siteId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    await assertMember(session.id, workspaceId);

    const entitlement = await checkEntitlement(workspaceId, "seo.audit");
    if (!entitlement.allowed) {
      return NextResponse.json({ ok: false, error: "SEO audit is not included in your plan" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = auditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "postId and siteId are required" }, { status: 400 });
    }

    const post = await prisma.editorialPost.findUnique({ where: { id: parsed.data.postId } });
    if (!post) {
      return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
    }

    const recommendations = generateAuditRecommendations(post.title, post.seoTitle, post.metaDescription);
    const score = Math.max(0, 100 - recommendations.length * 15);

    const audit = await prisma.seoAudit.create({
      data: {
        siteId: parsed.data.siteId,
        postId: parsed.data.postId,
        score,
        recommendations: JSON.stringify(recommendations),
      },
    });

    await prisma.activityEvent.create({
      data: {
        workspaceId,
        siteId: parsed.data.siteId,
        type: "seo.audit.completed",
        title: `SEO audit for "${post.title}"`,
        detail: `Score: ${score}/100`,
        status: "succeeded",
      },
    });

    return NextResponse.json({ ok: true, data: audit }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run audit";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

type Recommendation = { title: string; detail: string; severity: "high" | "medium" | "low" };

function generateAuditRecommendations(
  title: string,
  seoTitle: string | null,
  metaDescription: string | null,
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (!seoTitle) {
    recs.push({ title: "Missing SEO title", detail: "Add a dedicated SEO title for better search visibility.", severity: "high" });
  } else if (seoTitle.length < 30) {
    recs.push({ title: "SEO title too short", detail: "Aim for 50-60 characters.", severity: "medium" });
  }

  if (!metaDescription) {
    recs.push({ title: "Missing meta description", detail: "Add a meta description (120-160 chars) for search snippets.", severity: "high" });
  } else if (metaDescription.length < 80) {
    recs.push({ title: "Meta description too short", detail: "Aim for 120-160 characters.", severity: "medium" });
  }

  if (title.length > 70) {
    recs.push({ title: "Title may be truncated", detail: "Keep titles under 60-70 characters for full display in SERPs.", severity: "low" });
  }

  return recs;
}
