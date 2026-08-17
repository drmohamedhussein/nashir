"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = {
  id: string;
  title: string;
  status: string;
  siteName: string;
};

export function UpcomingPosts({ posts }: { posts: Item[] }) {
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
      setError(data.error ?? "تعذر التنفيذ.");
      return;
    }
    router.refresh();
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6">
      <h2 className="text-lg font-semibold">أوامر سريعة</h2>
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
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => run(post.id, "publish")} disabled={Boolean(busy)} className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                انشر الآن
              </button>
              <button type="button" onClick={() => run(post.id, "publish_keep_date")} disabled={Boolean(busy)} className="rounded-full border border-ink/15 px-3 py-1 text-xs disabled:opacity-60">
                انشر مع التاريخ
              </button>
              <button type="button" onClick={() => run(post.id, "unpublish")} disabled={Boolean(busy)} className="rounded-full border border-ink/15 px-3 py-1 text-xs disabled:opacity-60">
                إلغاء نشر
              </button>
              <button type="button" onClick={() => run(post.id, "republish")} disabled={Boolean(busy)} className="rounded-full border border-ink/15 px-3 py-1 text-xs disabled:opacity-60">
                إعادة نشر
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
