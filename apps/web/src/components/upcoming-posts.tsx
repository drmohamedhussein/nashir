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
  const actionable = posts.filter((post) => post.status !== "publish" && post.status !== "trash");

  async function publishNow(id: string) {
    setBusy(id);
    setError("");
    const response = await fetch(`/api/v1/posts/${id}/publish`, { method: "POST" });
    const data = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(data.error ?? "تعذر النشر.");
      return;
    }
    router.refresh();
  }

  if (actionable.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6">
      <h2 className="text-lg font-semibold">بانتظار النشر</h2>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <ul className="mt-4 space-y-3">
        {actionable.slice(0, 12).map((post) => (
          <li key={post.id} className="flex items-center justify-between gap-4 text-sm">
            <div>
              <div className="font-medium">{post.title}</div>
              <div className="text-xs text-ink-soft">
                {post.siteName} · {post.status}
              </div>
            </div>
            <button
              type="button"
              onClick={() => publishNow(post.id)}
              disabled={busy === post.id}
              className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy === post.id ? "..." : "انشر الآن"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
