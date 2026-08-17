import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
import { getLocale } from "@/lib/locale";
import { publicAppUrl } from "@/lib/environments";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicAppUrl()),
  title: "RankPublish — Publish on time for WordPress",
  description: "Cloud editorial calendar, SEO, scheduling, and social sharing for WordPress.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const fontClass =
    locale === "ar"
      ? "font-[family-name:var(--font-arabic)]"
      : "font-[family-name:var(--font-manrope)]";

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${manrope.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className={`min-h-full bg-background text-foreground ${fontClass}`}>{children}</body>
    </html>
  );
}
