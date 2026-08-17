import { CalendarMonth } from "@/components/calendar-month";
import { UpcomingPosts } from "@/components/upcoming-posts";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
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

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.calendar}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.calendarHint}</p>
      <CalendarMonth posts={mapped} />
      <UpcomingPosts posts={mapped} />
    </div>
  );
}
