import Link from "next/link";
import { notFound } from "next/navigation";
import { PostWorkspace } from "@/components/post-workspace";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { callWordPress } from "@/lib/wordpress";

type Params = { params: Promise<{ siteId: string; wpPostId: string }> };

export default async function PostWorkspacePage({ params }: Params) {
  const session = await getSession();
  if (!session) {
    notFound();
  }

  const { siteId, wpPostId } = await params;
  const postId = Number(wpPostId);
  if (!Number.isFinite(postId) || postId < 1) {
    notFound();
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site || !site.restUrl.includes("rankpublish/v1")) {
    notFound();
  }

  const locale = await getLocale();
  const copy = t(locale);

  let post: Record<string, unknown>;
  try {
    const result = await callWordPress<{ ok: boolean; post?: Record<string, unknown> }>({
      restUrl: site.restUrl,
      signingSecret: site.signingSecret,
      method: "GET",
      path: `posts/${postId}`,
    });
    if (!result.post) {
      notFound();
    }
    post = result.post;
  } catch {
    notFound();
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        <Link href="/app" className="hover:text-brand">
          {copy.sites}
        </Link>
        {" / "}
        <Link href={`/app/sites/${siteId}`} className="hover:text-brand">
          {site.name}
        </Link>
        {" / "}
        {String(post.title ?? copy.workspaceUntitled)}
      </p>

      <PostWorkspace
        siteId={siteId}
        locale={locale}
        initial={{
          wp_post_id: Number(post.wp_post_id ?? postId),
          title: String(post.title ?? ""),
          status: String(post.status ?? ""),
          post_type: String(post.post_type ?? "post"),
          permalink: typeof post.permalink === "string" ? post.permalink : null,
          scheduled_at: typeof post.scheduled_at === "string" ? post.scheduled_at : null,
          published_at: typeof post.published_at === "string" ? post.published_at : null,
          seo: (post.seo as Record<string, unknown> | null) ?? null,
          schedule: (post.schedule as Record<string, unknown> | null) ?? null,
        }}
      />
    </div>
  );
}
