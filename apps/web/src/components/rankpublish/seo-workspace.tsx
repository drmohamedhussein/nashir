"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type SeoItem = {
  id: string;
  title: string;
  siteId: string;
  siteName: string;
  seoTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  latestScore: number | null;
  latestRecommendations: Array<{ title: string; detail: string; severity: string }>;
  updatedAt: string;
};

function ScoreRing({ score }: { score: number | null }) {
  const s = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (s / 100) * circumference;
  const color = s >= 80 ? "text-emerald-500" : s >= 50 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
        <circle
          cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" className={color}
        />
      </svg>
      <span className="absolute text-xl font-extrabold text-slate-900">
        {score !== null ? score : "—"}
      </span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", styles[severity] ?? styles.low)}>
      {severity}
    </span>
  );
}

export function SeoWorkspace({
  items,
  locale,
  workspaceId,
}: {
  items: SeoItem[];
  locale: Locale;
  workspaceId: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = items.find((i) => i.id === selectedId);
  const [auditLoading, setAuditLoading] = useState(false);

  async function runAudit(postId: string, siteId: string) {
    setAuditLoading(true);
    try {
      await fetch(`/api/v1/workspaces/${workspaceId}/seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, siteId }),
      });
      window.location.reload();
    } finally {
      setAuditLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center text-sm text-ink-soft">
        No content synced yet. Connect a site and sync posts to start SEO analysis.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
              item.id === selectedId
                ? "border-sky-300 bg-sky-50/50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{item.siteName}</p>
            </div>
            {item.latestScore !== null && (
              <span className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                item.latestScore >= 80 ? "bg-emerald-50 text-emerald-700" :
                item.latestScore >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700",
              )}>
                {item.latestScore}
              </span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-500">SEO analysis</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{selected.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{selected.siteName}</p>
            </div>
            <ScoreRing score={selected.latestScore} />
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">SEO Title</label>
              <p className="mt-1 text-sm text-slate-800">{selected.seoTitle || "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meta Description</label>
              <p className="mt-1 text-sm text-slate-800">{selected.metaDescription || "—"}</p>
            </div>
            {selected.keywords.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Keywords</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.keywords.map((kw) => (
                    <span key={kw} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selected.latestRecommendations.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-slate-700">Recommendations</p>
              <div className="mt-3 space-y-2">
                {selected.latestRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3">
                    <SeverityBadge severity={rec.severity} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{rec.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => runAudit(selected.id, selected.siteId)}
            disabled={auditLoading}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {auditLoading ? "Running..." : "Run SEO Audit"}
          </button>
        </div>
      )}
    </div>
  );
}
