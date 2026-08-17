"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();

  async function setLocale(next: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-1 rounded-full border border-ink/10 px-2 py-1 text-xs">
      <button type="button" className={locale === "en" ? "font-bold text-brand" : "text-ink-soft"} onClick={() => setLocale("en")}>
        EN
      </button>
      <span className="text-ink/30">/</span>
      <button type="button" className={locale === "ar" ? "font-bold text-brand" : "text-ink-soft"} onClick={() => setLocale("ar")}>
        عربي
      </button>
    </div>
  );
}
