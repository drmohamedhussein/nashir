import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function DownloadPage() {
  const locale = await getLocale();
  const copy = t(locale);
  const steps = [
    { t: copy.how1t, b: copy.how1b },
    { t: copy.how2t, b: copy.how2b },
    { t: copy.how3t, b: copy.how3b },
  ];

  return (
    <div className="min-h-full bg-white">
      <SiteHeader locale={locale} />
      <div className="hero-gradient py-14">
        <div className="mx-auto max-w-2xl px-6">
          <p className="text-sm font-bold tracking-wide text-brand uppercase">{copy.plugin}</p>
          <h1 className="mt-2 text-4xl font-bold">{copy.download}</h1>
          <p className="mt-3 text-ink-soft">{copy.activateHint}</p>
        </div>
      </div>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.t} className="flex gap-4 rounded-[20px] bg-white p-5 shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <strong className="block">{step.t}</strong>
                <p className="mt-1 text-sm text-ink-soft">{step.b}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href="/downloads/nashir.zip" className="btn-gradient rounded-full px-5 py-3 text-sm font-bold">
            {copy.download}
          </a>
          <Link href="/register" className="rounded-full border border-ink/15 px-5 py-3 text-sm font-bold">
            {copy.start}
          </Link>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
