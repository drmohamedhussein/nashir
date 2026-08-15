import { CalendarMonth } from "@/components/calendar-month";
import { UpcomingPosts } from "@/components/upcoming-posts";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  return (
    <div>
      <h1 className="text-2xl font-bold">التقويم التحريري</h1>
      <p className="mt-2 text-sm text-ink-soft">
        المقالات تصل من مواقعك المرتبطة. النشر المستحق ينفَّذ من السحابة عبر النبضة أو أمر الجدولة.
      </p>
      <CalendarMonth posts={mapped} />
      <UpcomingPosts posts={mapped} />
    </div>
  );
}
