import { CalendarMonth } from "@/components/calendar-month";
import { UpcomingPosts } from "@/components/upcoming-posts";
import { EngineWorkspace } from "@/components/rankpublish/engine-workspace";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { isCloudUnreachableWpUrl, refreshSitePosts } from "@/lib/scheduler";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId, status: "connected" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, url: true, restUrl: true },
  });

  const syncErrors: string[] = [];
  for (const site of sites) {
    if (isCloudUnreachableWpUrl(site.url) || isCloudUnreachableWpUrl(site.restUrl)) {
      syncErrors.push(site.name);
      continue;
    }
    try {
      await refreshSitePosts(site.id);
    } catch {
      syncErrors.push(site.name);
    }
  }

  const posts = await prisma.editorialPost.findMany({
    where: { site: { workspaceId: session.workspaceId } },
    include: { site: true },
    orderBy: { scheduledAt: "asc" },
  });

  const mapped = posts.map((post) => ({
    id: post.id,
    title: post.title,
    status: post.status,
    siteName: post.site.name,
    date: (post.scheduledAt ?? post.publishedAt ?? post.syncedAt).toISOString(),
  }));

  const locale = await getLocale();
  const copy = t(locale);
  const syncError = mapped.length === 0 && syncErrors[0] ? copy.engineSyncCalendar : null;

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.calendar}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.calendarHint}</p>
      <EngineWorkspace kind="publish" sites={sites} locale={locale} syncError={syncError} />
      <CalendarMonth posts={mapped} locale={locale} />
      <UpcomingPosts posts={mapped} locale={locale} />
    </div>
  );
}
