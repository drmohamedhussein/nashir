"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export function ConnectionWizard({ locale, appUrl }: { locale: Locale; appUrl: string }) {
  const copy = t(locale);
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createSite() {
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/workspaces/current/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    }).catch(() => null);

    if (!response) {
      setError(copy.pairingError);
      setPending(false);
      return;
    }

    const data = (await response.json()) as {
      data?: { token?: string; expiresAt?: string };
      token?: string;
      expiresAt?: string;
      error?: { message?: string };
    };
    setPending(false);
    const nextToken = data.data?.token ?? data.token;
    if (!response.ok || !nextToken) {
      setError(data.error?.message ?? copy.pairingError);
      return;
    }
    setToken(nextToken);
    setExpiresAt(data.data?.expiresAt ?? data.expiresAt ?? null);
    setStep(2);
  }

  async function copyToken() {
    if (token) {
      await navigator.clipboard.writeText(token);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
        {copy.gettingStarted ?? "Getting started"} · {step}/3
      </p>
      <h2 className="mt-2 text-lg font-semibold">{copy.pairingTitle}</h2>

      {step === 1 ? (
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm"
            placeholder={copy.siteName ?? "Site name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            disabled={pending || !name || !url}
            onClick={createSite}
            className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
          >
            {pending ? copy.pending : copy.pairingCreate}
          </button>
        </div>
      ) : null}

      {step === 2 && token ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-soft">{copy.pairingHint}</p>
          <p className="font-mono text-3xl tracking-[0.35em] text-leaf">{token}</p>
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
            <button type="button" onClick={copyToken} className="rounded-full border border-ink/15 px-3 py-1 text-xs">
              {copy.pairingCopy}
            </button>
            <button type="button" onClick={() => setStep(3)} className="rounded-full bg-ink px-4 py-2 text-sm text-paper">
              {copy.continue ?? "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-4 space-y-3 text-sm text-ink-soft">
          <p>{copy.verifyConnection ?? "After pasting the token in WordPress, return here and refresh your sites list."}</p>
          <button type="button" onClick={() => router.refresh()} className="rounded-full bg-ink px-4 py-2 text-sm text-paper">
            {copy.refreshSites ?? "Refresh sites"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
