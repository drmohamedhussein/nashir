"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function SiteCard({
  id,
  name,
  url,
  status,
  wpVersion,
  lastSeen,
  subscriptionId,
  locale,
}: {
  id: string;
  name: string;
  url: string;
  status: string;
  wpVersion: string | null;
  lastSeen: string | null;
  subscriptionId?: string | null;
  locale: Locale;
}) {
  const router = useRouter();
  const copy = t(locale);
  const [pending, setPending] = useState(false);

  async function disconnect() {
    if (!confirm(copy.disconnectConfirm)) {
      return;
    }
    setPending(true);
    const response = await fetch(`/api/v1/sites/${id}`, { method: "DELETE" });
    setPending(false);
    if (response.ok) {
      router.refresh();
    }
  }

  async function unbind() {
    if (!subscriptionId) {
      return;
    }
    if (!confirm(copy.unbindConfirm)) {
      return;
    }
    setPending(true);
    const response = await fetch(`/api/v1/subscriptions/${subscriptionId}/unbind`, { method: "POST" });
    setPending(false);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <article className="rounded-2xl bg-white p-5 shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">
            <Link href={`/app/sites/${id}`} className="hover:text-brand">
              {name}
            </Link>
          </h2>
          <a className="text-sm text-brand" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs text-brand">
          {status === "connected" ? copy.connectedLabel : status}
        </span>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        WordPress {wpVersion ?? copy.wpUnknown}
        {lastSeen ? ` · ${copy.lastContact} ${lastSeen}` : ` · ${copy.noContact}`}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/app/sites/${id}`} className="text-brand hover:underline">
          {copy.openWorkspace}
        </Link>
        {subscriptionId ? (
          <button type="button" onClick={unbind} disabled={pending} className="text-purple disabled:opacity-60">
            {copy.rebind}
          </button>
        ) : null}
        <button type="button" onClick={disconnect} disabled={pending} className="text-danger disabled:opacity-60">
          {pending ? copy.pending : copy.deleteSite}
        </button>
      </div>
    </article>
  );
}
