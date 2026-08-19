"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatUsdFromCents, siteDisplayUrl } from "@/lib/billing-display";
import { t, type Locale } from "@/lib/i18n";

type Plan = {
  id: string;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  siteLimit: number;
};

type Seat = {
  id: string;
  interval: string;
  status: string;
  priceCents: number;
  planId: string | null;
  planName: string | null;
  currentPeriodEnd: string;
  siteId: string | null;
  siteUrl: string | null;
  siteName: string | null;
  paypalSubscriptionId: string | null;
};

export function BillingPanel({
  seats,
  plans,
  paypalConfigured,
  locale,
}: {
  seats: Seat[];
  plans: Plan[];
  paypalConfigured: boolean;
  locale: Locale;
}) {
  const copy = t(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const plan = plans[0];

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const subscriptionId = searchParams.get("subscription_id");
    if (checkout !== "success" || !subscriptionId) {
      return;
    }

    void (async () => {
      setPending(true);
      await fetch("/api/v1/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "capture", subscriptionId }),
      });
      setPending(false);
      router.replace("/app/billing");
      router.refresh();
    })();
  }, [searchParams, router]);

  async function startTrial(interval: "monthly" | "yearly") {
    if (!plan) return;
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trial", planId: plan.id, interval }),
    });
    const data = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    if (!response.ok) {
      setError(data.error?.message ?? copy.billingError);
      return;
    }
    router.refresh();
  }

  async function checkout(interval: "monthly" | "yearly") {
    if (!plan) return;
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", planId: plan.id, interval }),
    });
    const data = (await response.json()) as { data?: { url?: string }; error?: { message?: string } };
    setPending(false);
    if (!response.ok || !data.data?.url) {
      setError(data.error?.message ?? copy.billingError);
      return;
    }
    window.location.href = data.data.url;
  }

  async function openPortal() {
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "portal" }),
    });
    const data = (await response.json()) as { data?: { url?: string }; error?: { message?: string } };
    setPending(false);
    if (!response.ok || !data.data?.url) {
      setError(data.error?.message ?? copy.billingError);
      return;
    }
    window.location.href = data.data.url;
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

  if (!plan) {
    return <p className="text-sm text-ink-soft">{copy.billingNoSeats}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">{copy.billingIntro}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{copy.monthly}</h3>
          <p className="mt-2 text-3xl font-bold">{formatUsdFromCents(plan.monthlyPriceCents)}</p>
          <p className="text-sm text-ink-soft">{copy.perSite}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTrial("monthly")}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {copy.billingTrialMonthly}
            </button>
            {paypalConfigured ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => checkout("monthly")}
                className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper disabled:opacity-60"
              >
                PayPal · {copy.billingSubscribe ?? "Subscribe"}
              </button>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase text-sky-700">{copy.popular}</span>
          <h3 className="mt-1 text-lg font-semibold">{copy.yearly}</h3>
          <p className="mt-2 text-3xl font-bold">{formatUsdFromCents(plan.yearlyPriceCents)}</p>
          <p className="text-sm text-ink-soft">{copy.perSite}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTrial("yearly")}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {copy.billingTrialYearly}
            </button>
            {paypalConfigured ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => checkout("yearly")}
                className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper disabled:opacity-60"
              >
                PayPal · {copy.billingSubscribe ?? "Subscribe"}
              </button>
            ) : null}
          </div>
        </article>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">{copy.billingEntitlementsTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{copy.billingEntitlementsLead}</p>
        <ul className="mt-4 space-y-3">
          {[
            { title: copy.billingEnt1Title, body: copy.billingEnt1Body },
            { title: copy.billingEnt2Title, body: copy.billingEnt2Body },
            { title: copy.billingEnt3Title, body: copy.billingEnt3Body },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700" aria-hidden="true">
                ✓
              </span>
              <div className="min-w-0 flex-1 text-start">
                <strong className="block text-sm font-semibold text-ink">{item.title}</strong>
                <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {!paypalConfigured ? (
        <p className="rounded-xl border border-dashed border-ink/15 bg-slate-50/50 p-4 text-sm text-ink-soft">
          {copy.paypalLater}
        </p>
      ) : null}

      {paypalConfigured && seats.some((s) => s.paypalSubscriptionId) ? (
        <button type="button" disabled={pending} onClick={openPortal} className="rounded-full border border-ink/15 px-4 py-2 text-sm">
          {copy.billingManage ?? "Manage PayPal subscription"}
        </button>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {seats.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm text-ink-soft">{copy.billingNoSeats}</p>
      ) : (
        <ul className="space-y-3">
          {seats.map((seat) => {
            const href = siteDisplayUrl(seat.siteUrl);
            const statusLabel =
              seat.status === "trial"
                ? copy.billingStatusTrial
                : seat.status === "active"
                  ? copy.billingStatusActive
                  : seat.status;
            const priceLabel = formatUsdFromCents(
              seat.interval === "yearly" ? plan.yearlyPriceCents || seat.priceCents : plan.monthlyPriceCents || seat.priceCents,
            );
            return (
            <li key={seat.id} className="rounded-2xl bg-white p-5 text-sm shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
              <div className="font-medium">
                {seat.planName ?? seat.planId ?? "Plan"} · {seat.interval} · {statusLabel} · {priceLabel}
              </div>
              <div className="mt-1 text-ink-soft">
                {copy.billingUntil} {new Date(seat.currentPeriodEnd).toLocaleDateString(locale)}
              </div>
              {seat.siteId ? (
                <div className="mt-2 text-ink-soft">
                  {seat.siteName ? <div>{seat.siteName}</div> : null}
                  {href ? (
                    <a className="text-purple break-all" href={href} rel="noreferrer" target="_blank">
                      {href}
                    </a>
                  ) : (
                    <span>{copy.billingEmptySeat}</span>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-ink-soft">{copy.billingEmptySeat}</div>
              )}
              {seat.siteId ? (
                <button type="button" className="mt-3 text-purple" onClick={() => unbind(seat.id)} disabled={pending}>
                  {copy.rebind}
                </button>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
