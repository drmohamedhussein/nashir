"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type Seat = {
  id: string;
  interval: string;
  status: string;
  priceCents: number;
  currentPeriodEnd: string;
  siteId: string | null;
  siteUrl: string | null;
  siteName: string | null;
};

export function BillingPanel({ seats, locale }: { seats: Seat[]; locale: Locale }) {
  const copy = t(locale);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function addSeat(interval: "monthly" | "yearly") {
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? copy.billingError);
      return;
    }
    router.refresh();
  }

  async function unbind(id: string) {
    if (!confirm(copy.unbindConfirm)) {
      return;
    }
    setPending(true);
    await fetch(`/api/v1/subscriptions/${id}/unbind`, { method: "POST" });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">{copy.billingIntro}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => addSeat("monthly")}
          className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
        >
          {copy.billingTrialMonthly}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => addSeat("yearly")}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm disabled:opacity-60"
        >
          {copy.billingTrialYearly}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {seats.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm text-ink-soft">{copy.billingNoSeats}</p>
      ) : (
        <ul className="space-y-3">
          {seats.map((seat) => (
            <li key={seat.id} className="rounded-2xl bg-white p-5 text-sm shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
              <div className="font-medium">
                {seat.interval} · {seat.status} · {(seat.priceCents / 100).toFixed(2)}$
              </div>
              <div className="mt-1 text-ink-soft">
                {copy.billingUntil} {new Date(seat.currentPeriodEnd).toLocaleDateString(locale)}
                {seat.siteUrl
                  ? ` · ${seat.siteName} (${seat.siteUrl})`
                  : ` · ${copy.billingEmptySeat}`}
              </div>
              {seat.siteId ? (
                <button type="button" className="mt-3 text-purple" onClick={() => unbind(seat.id)} disabled={pending}>
                  {copy.rebind}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
