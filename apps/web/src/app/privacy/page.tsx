import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const copy = t(locale);
  return (
    <div className="min-h-full bg-white">
      <SiteHeader locale={locale} />
      <div className="hero-gradient py-14">
        <div className="mx-auto max-w-2xl px-6">
          <h1 className="text-4xl font-bold">{copy.privacy}</h1>
          <p className="mt-3 text-ink-soft">15 Aug 2026</p>
        </div>
      </div>
      <main className="mx-auto max-w-2xl px-6 py-16 leading-8">
        <article className="rounded-[20px] bg-white p-6 shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
          <p>{copy.privacyBody}</p>
        </article>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
