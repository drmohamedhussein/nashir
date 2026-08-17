import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale";

export default async function LoginPage() {
  const locale = await getLocale();
  return (
    <div className="flex min-h-full flex-col bg-white">
      <SiteHeader locale={locale} />
      <main className="flex-1">
        <AuthForm mode="login" locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
