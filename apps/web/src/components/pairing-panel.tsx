"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function PairingPanel({
  locale,
  appUrl,
  intendedSiteUrl,
  intendedSiteName,
}: {
  locale: Locale;
  appUrl: string;
  intendedSiteUrl?: string | null;
  intendedSiteName?: string;
}) {
  const copy = t(locale);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createCode() {
    setPending(true);
    setError("");
    setCopied(false);
    const response = await fetch("/api/v1/pairing", { method: "POST" });
    const data = (await response.json()) as { code?: string; error?: string };
    setPending(false);
    if (!response.ok || !data.code) {
      setError(data.error ?? copy.pairingError);
      return;
    }
    setCode(data.code);
  }

  async function copyCode() {
    if (!code) {
      return;
    }
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-ink/10 bg-white p-6">
      <h2 className="text-lg font-semibold">{copy.pairingTitle}</h2>
      {intendedSiteUrl ? (
        <p className="mt-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-ink">
          <strong className="block text-brand">{copy.intendedSiteTitle}</strong>
          {copy.intendedSiteBody.replace("{url}", intendedSiteUrl)}
          {intendedSiteName ? <span className="mt-1 block text-ink-soft">{intendedSiteName}</span> : null}
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-7 text-ink-soft">{copy.pairingHint}</p>
      <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-ink-soft">
        <li>{copy.pairingStep1}</li>
        <li>{copy.pairingStep2.replace("{url}", appUrl)}</li>
        <li>{copy.pairingStep3}</li>
      </ol>
      <button
        type="button"
        onClick={createCode}
        disabled={pending}
        className="mt-4 rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
      >
        {pending ? copy.pending : copy.pairingCreate}
      </button>
      {code ? (
        <div className="mt-4 min-w-0 space-y-3">
          <p className="overflow-hidden rounded-xl bg-leaf/10 px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.45em] text-leaf">
            {code}
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="rounded-full border border-ink/15 px-3 py-1 text-xs hover:border-brand hover:text-brand"
          >
            {copied ? copy.pairingCopied : copy.pairingCopy}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
