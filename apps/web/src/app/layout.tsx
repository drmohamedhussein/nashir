import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "ناشر — جدولة المحتوى لووردبريس",
  description:
    "حساب واحد لتقويمك التحريري. تابع المقالات وانشر في موعدها من موقعك أو من لوحة ناشر.",
  openGraph: {
    title: "ناشر",
    description: "تقويم تحريري سحابي لمواقع ووردبريس.",
    locale: "ar_AR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
