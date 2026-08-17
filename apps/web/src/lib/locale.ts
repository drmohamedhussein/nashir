import { cookies } from "next/headers";
import type { Locale } from "./i18n";

const COOKIE = "nashir_locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value === "ar" ? "ar" : "en";
}
