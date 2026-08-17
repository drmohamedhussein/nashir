"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type Capability = { id: string; label: string; integration: string };

type PostBrief = {
  wp_post_id: number;
  title: string;
  status: string;
  post_type: string;
  permalink: string | null;
  scheduled_at: string | null;
  published_at: string | null;
};

export function SiteWorkspace({ siteId, locale }: { siteId: string; locale: Locale }) {
  const copy = t(locale);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [posts, setPosts] = useState<PostBrief[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const [capRes, postsRes] = await Promise.all([
        fetch(`/api/v1/sites/${siteId}/capabilities`),
        fetch(`/api/v1/sites/${siteId}/posts?per_page=50`),
      ]);

      if (cancelled) {
        return;
      }

      const capData = (await capRes.json()) as { capabilities?: Capability[]; error?: string };
      const postsData = (await postsRes.json()) as { posts?: PostBrief[]; error?: string };

      if (!capRes.ok) {
        setError(capData.error ?? copy.workspaceLoadError);
        setLoading(false);
        return;
      }

      if (!postsRes.ok) {
        setError(postsData.error ?? copy.workspaceLoadError);
        setCapabilities(capData.capabilities ?? []);
        setLoading(false);
        return;
      }

      setCapabilities(capData.capabilities ?? []);
      setPosts(postsData.posts ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [siteId, copy.workspaceLoadError]);

  const integrations = [...new Set(capabilities.map((row) => row.integration))];

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr]">
      <aside className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">{copy.workspaceCapabilities}</h2>
        {loading ? (
          <p className="mt-3 text-xs text-ink-soft">{copy.pending}</p>
        ) : integrations.length === 0 ? (
          <p className="mt-3 text-xs text-ink-soft">{copy.workspaceNoCapabilities}</p>
        ) : (
          <ul className="mt-3 space-y-3 text-xs">
            {integrations.map((integration) => (
              <li key={integration}>
                <div className="font-medium capitalize">{integration}</div>
                <ul className="mt-1 space-y-1 text-ink-soft">
                  {capabilities
                    .filter((row) => row.integration === integration)
                    .map((row) => (
                      <li key={row.id}>{row.label}</li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="rounded-2xl border border-ink/10 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{copy.workspacePosts}</h2>
          <span className="text-xs text-ink-soft">{posts.length}</span>
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="mt-6 text-sm text-ink-soft">{copy.pending}</p>
        ) : posts.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{copy.workspaceNoPosts}</p>
        ) : (
          <ul className="mt-6 divide-y divide-ink/10">
            {posts.map((post) => (
              <li key={post.wp_post_id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <Link
                    href={`/app/sites/${siteId}/posts/${post.wp_post_id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {post.title || copy.workspaceUntitled}
                  </Link>
                  <p className="mt-1 text-xs text-ink-soft">
                    {post.status} · {post.post_type}
                    {post.scheduled_at ? ` · ${copy.workspaceScheduled} ${formatWhen(post.scheduled_at, locale)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link
                    href={`/app/sites/${siteId}/posts/${post.wp_post_id}`}
                    className="rounded-full border border-ink/15 px-3 py-1 hover:border-brand hover:text-brand"
                  >
                    {copy.workspaceOpenPost}
                  </Link>
                  {post.permalink ? (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-ink/15 px-3 py-1 hover:border-brand hover:text-brand"
                    >
                      {copy.workspaceViewLive}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatWhen(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale === "ar" ? "ar" : "en");
}
