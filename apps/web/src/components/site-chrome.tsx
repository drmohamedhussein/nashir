import Link from "next/link";
import { LocaleSwitch } from "./locale-switch";
import { BrandMark } from "@/components/rankpublish/brand-mark";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const session = await getSession();
  return (
    <>
      <div className="trial-banner px-4 py-2.5 text-center text-sm font-semibold text-white">
        {copy.promo}{" "}
        <Link href="/register" className="underline underline-offset-4">
          {copy.ctaStarted}
        </Link>
      </div>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="text-foreground">
            <BrandMark className="[&_span:last-child_span:first-child]:text-foreground [&_span:last-child_span:last-child]:text-muted-foreground" />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-muted-foreground md:flex">
            <Link href="/#features" className="hover:text-foreground">
              {copy.navFeatures}
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              {copy.pricing}
            </Link>
            <Link href="/download" className="hover:text-foreground">
              {copy.plugin}
            </Link>
            <Link href="/guide" className="hover:text-foreground">
              {copy.navGuide}
            </Link>
          </nav>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {session ? (
              <Button asChild size="sm">
                <Link href="/app">{copy.dashboard}</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline">
                  {copy.login}
                </Link>
                <Button asChild size="sm">
                  <Link href="/register">{copy.ctaStarted}</Link>
                </Button>
              </>
            )}
            <LocaleSwitch locale={locale} />
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <footer className="mt-0 bg-[#11172a] text-sm text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <BrandMark className="mb-3 text-white [&_span:last-child_span:last-child]:text-sky-300/75" />
          <p>{copy.tagline}</p>
        </div>
        <div>
          <h4 className="mb-2 font-bold text-white">{copy.footerProd}</h4>
          <Link className="mt-2 block hover:text-white" href="/#features">
            {copy.navFeatures}
          </Link>
          <Link className="mt-2 block hover:text-white" href="/pricing">
            {copy.pricing}
          </Link>
          <Link className="mt-2 block hover:text-white" href="/download">
            {copy.plugin}
          </Link>
          <Link className="mt-2 block hover:text-white" href="/guide">
            {copy.navGuide}
          </Link>
        </div>
        <div>
          <h4 className="mb-2 font-bold text-white">{copy.footerSupport}</h4>
          <Link className="mt-2 block hover:text-white" href="/download">
            {copy.download}
          </Link>
          <Link className="mt-2 block hover:text-white" href="/guide">
            {copy.navGuide}
          </Link>
          <Link className="mt-2 block hover:text-white" href="/privacy">
            {copy.privacy}
          </Link>
        </div>
        <div>
          <h4 className="mb-2 font-bold text-white">{copy.footerLegal}</h4>
          <Link className="mt-2 block hover:text-white" href="/privacy">
            {copy.privacy}
          </Link>
          <Link className="mt-2 block hover:text-white" href="/terms">
            {copy.terms}
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/10 px-6 py-4 text-xs text-slate-400">
        <span>{copy.copyNote}</span>
      </div>
    </footer>
  );
}
