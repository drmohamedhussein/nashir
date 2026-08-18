import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { SeoWorkspace } from "@/components/rankpublish/seo-workspace";

export default async function SeoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const copy = t(locale);

  const posts = await prisma.editorialPost.findMany({
    where: { site: { workspaceId: session.workspaceId } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      site: { select: { name: true } },
      seoAudits: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const items = posts.map((p) => ({
    id: p.id,
    title: p.title,
    siteId: p.siteId,
    siteName: p.site.name,
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
    keywords: p.keywords ? JSON.parse(p.keywords) as string[] : [],
    latestScore: p.seoAudits[0]?.score ?? null,
    latestRecommendations: p.seoAudits[0]?.recommendations
      ? JSON.parse(p.seoAudits[0].recommendations) as Array<{ title: string; detail: string; severity: string }>
      : [],
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.seo ?? "SEO Workspace"}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.seoHint ?? "Review SEO scores and optimize your content metadata."}</p>
      <SeoWorkspace items={items} locale={locale} workspaceId={session.workspaceId} />
    </div>
  );
}
