"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { isHqOrigin } from "@/lib/tenant-origin";

export type ConnectedSite = {
  id: string;
  name: string;
  url: string;
  restUrl: string;
};

const PUBLISH_TABS = [
  { id: "scheduler", label: "Scheduler", page: "schedulepress" },
  { id: "calendar", label: "Calendar", page: "schedulepress-calendar" },
] as const;

const SEO_TABS = [
  { id: "dashboard", label: "SEO Dashboard", page: "thinkrank" },
  { id: "essential", label: "Essential SEO", page: "thinkrank-essential-seo" },
  { id: "ai", label: "AI Tools", page: "thinkrank-ai-tools" },
  { id: "usages", label: "Usages", page: "thinkrank-usages" },
  { id: "settings", label: "SEO Settings", page: "thinkrank-settings" },
  { id: "license", label: "Account", page: "thinkrank-license" },
] as const;

function wpAdminUrl(siteUrl: string, page: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return `${base}/wp-admin/admin.php?page=${encodeURIComponent(page)}&rp_os=1`;
}

export function EngineWorkspace({
  kind,
  sites,
  locale,
  syncError,
}: {
  kind: "publish" | "seo";
  sites: ConnectedSite[];
  locale: Locale;
  syncError?: string | null;
}) {
  const copy = t(locale);
  const tabs = kind === "publish" ? PUBLISH_TABS : SEO_TABS;
  const [selectedId, setSelectedId] = useState(sites[0]?.id ?? "");
  const site = useMemo(
    () => sites.find((row) => row.id === selectedId) ?? sites[0],
    [sites, selectedId],
  );

  if (!site) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-ink/15 p-8 text-sm text-ink-soft">
        {copy.engineNoSite}
      </div>
    );
  }

  const hqBlocked = isHqOrigin(site.url) || isHqOrigin(site.restUrl);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {copy.engineOpenOnWp}{" "}
          <strong className="text-ink">{site.name}</strong>
        </p>
        {sites.length > 1 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-soft">{copy.enginePickSite}</span>
            <select
              className="rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-sm"
              value={site.id}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {sites.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <a className="text-xs font-semibold text-brand hover:underline" href={site.url} target="_blank" rel="noreferrer">
            {site.url}
          </a>
        )}
      </div>
      {hqBlocked ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.engineHqBlocked}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={wpAdminUrl(site.url, tab.page)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-soft">{copy.engineCloudNote}</p>
      {syncError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {syncError}
        </p>
      ) : null}
    </div>
  );
}
