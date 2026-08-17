import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { HomeLanding } from "@/components/marketing/home";
import { getLocale } from "@/lib/locale";

export default async function HomePage() {
  const locale = await getLocale();
  return (
    <div className="min-h-full bg-white">
      <SiteHeader locale={locale} />
      <main>
        <HomeLanding locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
