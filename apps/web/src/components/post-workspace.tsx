"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type PostWorkspaceData = {
  wp_post_id: number;
  title: string;
  status: string;
  post_type: string;
  permalink: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  seo: Record<string, unknown> | null;
  schedule: Record<string, unknown> | null;
};

function readString(source: Record<string, unknown> | null, ...keys: string[]): string {
  if (!source) {
    return "";
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

function readBool(source: Record<string, unknown> | null, ...keys: string[]): boolean {
  if (!source) {
    return false;
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return false;
}

export function PostWorkspace({
  siteId,
  locale,
  initial,
}: {
  siteId: string;
  locale: Locale;
  initial: PostWorkspaceData;
}) {
  const copy = t(locale);
  const router = useRouter();

  const seoSource = (initial.seo ?? {}) as Record<string, unknown>;
  const schedSource = (initial.schedule ?? {}) as Record<string, unknown>;

  const [seoTitle, setSeoTitle] = useState(
    readString(seoSource, "seo_title", "title", "thinkrank_seo_title"),
  );
  const [seoDescription, setSeoDescription] = useState(
    readString(seoSource, "meta_description", "description", "thinkrank_meta_description"),
  );
  const [focusKeyword, setFocusKeyword] = useState(
    readString(seoSource, "focus_keyword", "thinkrank_focus_keyword"),
  );
  const [scheduleDate, setScheduleDate] = useState(
    readString(schedSource, "schedule_date", "scheduled_date", "date"),
  );
  const [isScheduled, setIsScheduled] = useState(
    readBool(schedSource, "is_scheduled", "scheduled") || initial.status === "future",
  );

  const [seoMessage, setSeoMessage] = useState("");
  const [schedMessage, setSchedMessage] = useState("");
  const [seoPending, setSeoPending] = useState(false);
  const [schedPending, setSchedPending] = useState(false);

  async function saveSeo(event: React.FormEvent) {
    event.preventDefault();
    setSeoPending(true);
    setSeoMessage("");

    const response = await fetch(`/api/v1/sites/${siteId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "seo.post.write",
        payload: {
          post_id: initial.wp_post_id,
          title: seoTitle,
          description: seoDescription,
          focus_keyword: focusKeyword,
        },
      }),
    });

    const data = (await response.json()) as { error?: string };
    setSeoPending(false);
    setSeoMessage(response.ok ? copy.workspaceSaved : (data.error ?? copy.workspaceSaveError));
    if (response.ok) {
      router.refresh();
    }
  }

  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();
    setSchedPending(true);
    setSchedMessage("");

    const response = await fetch(`/api/v1/sites/${siteId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publishing.post.write",
        payload: {
          post_id: initial.wp_post_id,
          schedule_date: scheduleDate,
          is_scheduled: isScheduled,
        },
      }),
    });

    const data = (await response.json()) as { error?: string };
    setSchedPending(false);
    setSchedMessage(response.ok ? copy.workspaceSaved : (data.error ?? copy.workspaceSaveError));
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{initial.title || copy.workspaceUntitled}</h1>
            <p className="mt-2 text-sm text-ink-soft">
              {initial.status} · {initial.post_type} · #{initial.wp_post_id}
            </p>
          </div>
          {initial.permalink ? (
            <a
              href={initial.permalink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
            >
              {copy.workspaceViewLive}
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveSeo} className="rounded-2xl border border-ink/10 bg-white p-6">
          <h2 className="text-lg font-semibold">{copy.workspaceSeoPanel}</h2>
          <p className="mt-1 text-xs text-ink-soft">{copy.workspaceSeoHint}</p>

          <label className="mt-4 block text-sm">
            {copy.workspaceSeoTitle}
            <input
              className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
            />
          </label>

          <label className="mt-4 block text-sm">
            {copy.workspaceSeoDescription}
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
            />
          </label>

          <label className="mt-4 block text-sm">
            {copy.workspaceFocusKeyword}
            <input
              className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
              value={focusKeyword}
              onChange={(event) => setFocusKeyword(event.target.value)}
            />
          </label>

          {seoMessage ? <p className="mt-3 text-sm text-ink-soft">{seoMessage}</p> : null}

          <button
            type="submit"
            disabled={seoPending}
            className="mt-4 rounded-full bg-brand px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {seoPending ? copy.pending : copy.workspaceSaveSeo}
          </button>
        </form>

        <form onSubmit={saveSchedule} className="rounded-2xl border border-ink/10 bg-white p-6">
          <h2 className="text-lg font-semibold">{copy.workspaceSchedulePanel}</h2>
          <p className="mt-1 text-xs text-ink-soft">{copy.workspaceScheduleHint}</p>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(event) => setIsScheduled(event.target.checked)}
            />
            {copy.workspaceIsScheduled}
          </label>

          <label className="mt-4 block text-sm">
            {copy.workspaceScheduleDate}
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
              value={scheduleDate ? toLocalInput(scheduleDate) : ""}
              onChange={(event) => setScheduleDate(fromLocalInput(event.target.value))}
              disabled={!isScheduled}
            />
          </label>

          {schedMessage ? <p className="mt-3 text-sm text-ink-soft">{schedMessage}</p> : null}

          <button
            type="submit"
            disabled={schedPending}
            className="mt-4 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {schedPending ? copy.pending : copy.workspaceSaveSchedule}
          </button>
        </form>
      </div>

      <Link href={`/app/sites/${siteId}`} className="inline-block text-sm text-brand hover:underline">
        ← {copy.workspaceBackToSite}
      </Link>
    </div>
  );
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}
