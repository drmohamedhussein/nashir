import Link from "next/link";
import { PairingPanel } from "@/components/pairing-panel";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { isSubscriptionLive } from "@/lib/plans";
import { ENV_URLS, publicAppUrl } from "@/lib/environments";
import { redirect } from "next/navigation";

export default async function GettingStartedPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const locale = await getLocale();
  const copy = t(locale);
  const cloudAppUrl = publicAppUrl();

  const [subscriptions, sites] = await Promise.all([
    prisma.subscription.findMany({
      where: { workspaceId: session.workspaceId },
      include: { site: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.site.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (sites.length > 0) {
    redirect("/app");
  }

  const liveTrial = subscriptions.find((row) => isSubscriptionLive(row.status, row.currentPeriodEnd));

  const steps = [
    { done: true, title: copy.onboardStep1Title, body: copy.onboardStep1Body },
    {
      done: Boolean(liveTrial),
      title: copy.onboardStep2Title,
      body: liveTrial
        ? copy.onboardStep2Done.replace("{date}", liveTrial.currentPeriodEnd.toLocaleDateString(locale))
        : copy.onboardStep2Body,
    },
    { done: false, title: copy.onboardStep3Title, body: copy.onboardStep3Body },
    { done: false, title: copy.onboardStep4Title, body: copy.onboardStep4Body },
    { done: false, title: copy.onboardStep5Title, body: copy.onboardStep5Body },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-brand">{copy.gettingStartedKicker}</p>
      <h1 className="mt-2 text-3xl font-bold">{copy.gettingStartedTitle}</h1>
      <p className="mt-3 text-ink-soft">
        {copy.gettingStartedWelcome.replace("{name}", session.name)}
      </p>
      <p className="mt-2 rounded-2xl bg-brand/5 px-4 py-3 text-sm text-ink-soft">
        {copy.dashboardUrlHint}{" "}
        <Link href="/app" className="font-semibold text-brand">
          {cloudAppUrl}/app
        </Link>
      </p>

      <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-4 text-xs text-ink-soft">
        <p className="font-semibold text-ink">{copy.envMapTitle}</p>
        <ul className="mt-2 space-y-1">
          <li>
            {copy.envSaas}: <span className="font-mono text-brand">{ENV_URLS.stagingSaas}</span>
          </li>
          <li>
            {copy.envLocalWp}: <span className="font-mono">{ENV_URLS.localWpDev}</span>
          </li>
          <li>
            {copy.envCustomerWp}: <span className="font-mono">{ENV_URLS.customerWpTest}</span>
          </li>
        </ul>
      </div>

      <ol className="mt-8 space-y-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`rounded-2xl border p-5 ${step.done ? "border-leaf/30 bg-leaf/5" : "border-ink/10 bg-white"}`}
          >
            <div className="flex gap-4">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  step.done ? "bg-leaf text-white" : "bg-ink/10 text-ink-soft"
                }`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <div>
                <h2 className="font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm leading-7 text-ink-soft">{step.body}</p>
                {index === 1 && !liveTrial ? (
                  <Link
                    href="/app/billing"
                    className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    {copy.onboardActivateTrial}
                  </Link>
                ) : null}
                {index === 2 ? (
                  <a
                    href="/wp-content/uploads/rankpublish/rankpublish.zip"
                    className="mt-3 inline-block rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
                  >
                    {copy.download}
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <PairingPanel locale={locale} appUrl={cloudAppUrl} />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/app" className="font-semibold text-brand hover:underline">
          {copy.goToDashboard}
        </Link>
        <Link href="/app/billing" className="text-ink-soft hover:text-brand">
          {copy.billing}
        </Link>
        <Link href="/download" className="text-ink-soft hover:text-brand">
          {copy.download}
        </Link>
      </div>
    </div>
  );
}
