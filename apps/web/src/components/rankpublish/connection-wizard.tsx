"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export function ConnectionWizard({
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
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createCode() {
    setPending(true);
    setError("");
    setCopied(false);
    const response = await fetch("/api/v1/pairing", { method: "POST" }).catch(() => null);
    if (!response) {
      setError(copy.pairingError);
      setPending(false);
      return;
    }
    const data = (await response.json()) as { code?: string; expiresAt?: string; error?: string };
    setPending(false);
    if (!response.ok || !data.code) {
      setError(data.error ?? copy.pairingError);
      return;
    }
    setCode(data.code.toUpperCase().slice(0, 6));
    setExpiresAt(data.expiresAt ?? null);
    setStep(2);
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
        {copy.gettingStarted ?? "Getting started"} · {step}/3
      </p>
      <h2 className="mt-2 text-lg font-semibold">{copy.pairingTitle}</h2>
      {intendedSiteUrl ? (
        <p className="mt-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-ink">
          <strong className="block text-brand">{copy.intendedSiteTitle}</strong>
          {copy.intendedSiteBody.replace("{url}", intendedSiteUrl)}
          {intendedSiteName ? <span className="mt-1 block text-ink-soft">{intendedSiteName}</span> : null}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-soft">{copy.pairingHint}</p>
          <ol className="list-decimal space-y-2 ps-5 text-sm text-ink-soft">
            <li>{copy.pairingStep1}</li>
            <li>{copy.pairingStep2.replace("{url}", appUrl)}</li>
            <li>{copy.pairingStep3}</li>
          </ol>
          <button
            type="button"
            disabled={pending}
            onClick={createCode}
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
          >
            {pending ? copy.pending : copy.pairingCreate}
          </button>
        </div>
      ) : null}

      {step === 2 && code ? (
        <div className="mt-4 min-w-0 space-y-3">
          <p className="text-sm text-ink-soft">{copy.pairingHint}</p>
          <p className="overflow-hidden rounded-xl bg-leaf/10 px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.45em] text-leaf">
            {code}
          </p>
          {expiresAt ? (
            <p className="text-xs text-ink-soft">
              {copy.pairingExpires ?? "Expires"} {new Date(expiresAt).toLocaleString(locale)}
            </p>
          ) : null}
          <ol className="list-decimal space-y-2 ps-5 text-sm text-ink-soft">
            <li>{copy.pairingStep1}</li>
            <li>{copy.pairingStep2.replace("{url}", appUrl)}</li>
            <li>{copy.pairingStep3}</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyCode} className="rounded-full border border-ink/15 px-3 py-1 text-xs">
              {copied ? copy.pairingCopied : copy.pairingCopy}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-full bg-ink px-4 py-2 text-sm text-paper"
            >
              {copy.continue ?? "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-4 space-y-3 text-sm text-ink-soft">
          <p>
            {copy.verifyConnection ??
              "After pasting the 6-character code in WordPress Cloud Connect, return here and refresh your sites list."}
          </p>
          {code ? (
            <p className="overflow-hidden rounded-xl bg-leaf/10 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.45em] text-leaf">
              {code}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper"
          >
            {copy.refreshSites ?? "Refresh sites"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
