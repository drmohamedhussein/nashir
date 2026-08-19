"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { localizeApiError } from "@/lib/localize-api-error";

type Item = {
  id: string;
  title: string;
  status: string;
  siteName: string;
  siteReachable?: boolean;
};

export function UpcomingPosts({ posts, locale }: { posts: Item[]; locale: Locale }) {
  const copy = t(locale);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(id: string, action: "publish" | "unpublish" | "republish" | "publish_keep_date") {
    setBusy(`${id}:${action}`);
    setError("");
    const response = await fetch(`/api/v1/posts/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(localizeApiError(data.error ?? copy.errorGeneric, locale));
      return;
    }
    router.refresh();
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6">
      <h2 className="text-lg font-semibold">{copy.quickActionsTitle}</h2>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <ul className="mt-4 space-y-3">
        {posts.slice(0, 16).map((post) => (
          <li key={post.id} className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div>
              <div className="font-medium">{post.title}</div>
              <div className="text-xs text-ink-soft">
                {post.siteName} · {post.status}
              </div>
            </div>
            {post.siteReachable === false ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                {copy.engineSyncCalendar?.slice(0, 60) ?? "Site unreachable from cloud"}
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => run(post.id, "publish")} disabled={Boolean(busy)} className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                  {copy.publishNow}
                </button>
                <button type="button" onClick={() => run(post.id, "publish_keep_date")} disabled={Boolean(busy)} className="rounded-full border border-ink/15 px-3 py-1 text-xs disabled:opacity-60">
                  {copy.publishKeepDate}
                </button>
                <button type="button" onClick={() => run(post.id, "unpublish")} disabled={Boolean(busy)} className="rounded-full border border-ink/15 px-3 py-1 text-xs disabled:opacity-60">
                  {copy.unpublish}
                </button>
                <button type="button" onClick={() => run(post.id, "republish")} disabled={Boolean(busy)} className="rounded-full border border-ink/15 px-3 py-1 text-xs disabled:opacity-60">
                  {copy.republish}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
