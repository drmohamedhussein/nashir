import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import Link from "next/link";

export default async function PricingPage() {
  const locale = await getLocale();
  const copy = t(locale);
  const items = [copy.p1, copy.p2, copy.p3, copy.p4, copy.p5, copy.p6, copy.p7, copy.p8];

  return (
    <div className="min-h-full bg-white">
      <SiteHeader locale={locale} />
      <div className="hero-gradient py-14">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-bold tracking-wide text-brand uppercase">{copy.priceK}</p>
          <h1 className="mt-2 text-4xl font-bold">{copy.priceH}</h1>
          <p className="mt-3 text-ink-soft">{copy.trialNote}</p>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="flex h-full flex-col gap-2 rounded-[22px] bg-white p-8 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
            <h2 className="text-lg font-bold">{copy.monthly}</h2>
            <p className="text-5xl font-extrabold">{copy.monthlyPrice}</p>
            <p className="text-sm text-ink-soft">{copy.perSite}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {items.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
            <Link href="/register" className="mt-6 inline-block rounded-full bg-brand px-4 py-2 text-center text-sm font-bold text-white">
              {copy.choosePlan}
            </Link>
          </article>
          <article className="relative flex h-full flex-col gap-2 rounded-[22px] bg-[#1e3a8a] p-8 text-white shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
            <span className="absolute top-4 end-4 rounded-full bg-purple px-2.5 py-1 text-xs font-bold">{copy.popular}</span>
            <h2 className="text-lg font-bold">{copy.yearly}</h2>
            <p className="text-5xl font-extrabold">{copy.yearlyPrice}</p>
            <p className="text-sm text-white/80">{copy.perSite}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              {items.map((item) => (
                <li key={`y-${item}`}>✓ {item}</li>
              ))}
            </ul>
            <Link href="/register" className="mt-6 inline-block rounded-full bg-white px-4 py-2 text-center text-sm font-bold text-brand">
              {copy.choosePlan}
            </Link>
          </article>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
