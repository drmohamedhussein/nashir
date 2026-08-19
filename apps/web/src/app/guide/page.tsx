import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function GuidePage() {
  const locale = await getLocale();
  const copy = t(locale);
  const ar = locale === "ar";

  const sections = ar
    ? [
        {
          title: "1. ثبّت الإضافة على موقعك",
          items: [
            "حمّل ملف RankPublish من صفحة التنزيل. لا تثبّت SchedulePress أو ThinkRank منفصلين.",
            "ووردبريس ← إضافات ← أضف جديداً ← رفع إضافة ← فعّل RankPublish.",
            "المحركات الأربعة تعمل داخل قائمة RankPublish على موقعك فوراً.",
          ],
        },
        {
          title: "2. أنشئ حساب RankPublish",
          items: [
            "سجّل من /register. كل موقع يبدأ بتجربة 7 أيام ثم 9.99$ شهرياً أو 99$ سنوياً.",
            "افتح Getting started وأنشئ رمز ربط من 6 أحرف.",
          ],
        },
        {
          title: "3. اربط الموقع",
          items: [
            "RankPublish ← Cloud Connect. الصق رابط الحساب ورمز الربط.",
            "المواقع المحلية (.local) لا تُسحب من السحابة. افتح wp-admin بعد الربط حتى تُدفع المقالات.",
          ],
        },
        {
          title: "4. Publish على ووردبريس",
          items: [
            "Scheduler: الجدولة التلقائية، الطابور، الحسابات الاجتماعية، إشعارات البريد، وأتمتة Pro.",
            "Calendar: تقويم سحب وإفلات.",
            "Publish workspace: جامعة روابط النشر مع الحساب السحابي.",
            "الشبكات: فيسبوك، X، لينكدإن، بنترست، إنستغرام، ثريدز، ميديوم، ماستودون، بلوسكاي، Google Business.",
          ],
        },
        {
          title: "5. Rank على ووردبريس",
          items: [
            "SEO Dashboard، Essential SEO (هوية، Schema، sitemap، وسوم اجتماعية، فهرسة، تحليلات، روابط Pro)، AI Tools، Usages، SEO Settings.",
            "صندوق SEO يظهر داخل محرر كل مقال.",
          ],
        },
        {
          title: "6. حساب السحابة",
          items: [
            "/app المواقع والربط. /app/calendar التقويم المُزامَن. /app/seo النتائج المُزامَنة. /app/social القوالب.",
            "Team و Billing و Settings و Activity لإدارة الحساب.",
            "الواجهات الكاملة للمحركات تُفتح من ووردبريس. السحابة لا تستبدلها.",
          ],
        },
        {
          title: "7. إضافة نطاق آخر",
          items: [
            "أبقِ الاشتراك سارياً، أنشئ رمز ربط جديداً من Getting started، ثبّت RankPublish على الموقع الجديد واربطه.",
          ],
        },
        {
          title: "8. إن لم يظهر التقويم في الحساب",
          items: [
            "تأكد أن الموقع Connected، افتح wp-admin مرة، احفظ أو اجدول مقالاً، ثم حدّث /app/calendar.",
          ],
        },
      ]
    : [
        {
          title: "1. Install the plugin on your WordPress",
          items: [
            "Download RankPublish. Do not install SchedulePress or ThinkRank separately.",
            "WordPress → Plugins → Add New → Upload Plugin → activate RankPublish.",
            "The four engines are available immediately under the RankPublish menu.",
          ],
        },
        {
          title: "2. Create a RankPublish account",
          items: [
            "Register at /register. Each site starts a 7-day trial, then $9.99/month or $99/year.",
            "Open Getting started and create a 6-character pairing code.",
          ],
        },
        {
          title: "3. Pair the site",
          items: [
            "RankPublish → Cloud Connect. Paste the cloud URL and pairing code.",
            "Local (.local) sites cannot be pulled by the cloud. Open wp-admin after pairing so posts are pushed.",
          ],
        },
        {
          title: "4. Publish on WordPress",
          items: [
            "Scheduler: auto-schedule, queue, social profiles, email notify, and Pro automation.",
            "Calendar: drag-and-drop editorial calendar.",
            "Publish workspace: hub of publishing links plus the cloud account.",
            "Networks: Facebook, X, LinkedIn, Pinterest, Instagram, Threads, Medium, Mastodon, Bluesky, Google Business.",
          ],
        },
        {
          title: "5. Rank on WordPress",
          items: [
            "SEO Dashboard, Essential SEO (identity, schema, sitemap, social meta, indexing, analytics, Pro links), AI Tools, Usages, SEO Settings.",
            "Each post has the SEO box in the editor.",
          ],
        },
        {
          title: "6. Cloud account",
          items: [
            "/app sites and pairing. /app/calendar synced calendar. /app/seo synced scores. /app/social templates.",
            "Team, Billing, Settings, and Activity manage the account.",
            "Full engine UIs stay on WordPress. The cloud does not replace them.",
          ],
        },
        {
          title: "7. Add another domain",
          items: [
            "Keep the subscription live, create a new pairing code, install RankPublish on the new site, and connect it.",
          ],
        },
        {
          title: "8. If the cloud calendar is empty",
          items: [
            "Confirm the site is Connected, open wp-admin once, save or schedule a post, then refresh /app/calendar.",
          ],
        },
      ];

  return (
    <div className="min-h-full bg-white">
      <SiteHeader locale={locale} />
      <div className="hero-gradient py-14">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-bold uppercase tracking-wide text-brand">{copy.navGuide}</p>
          <h1 className="mt-2 text-4xl font-bold">{ar ? "دليل الاستخدام" : "User guide"}</h1>
          <p className="mt-3 text-ink-soft">
            {ar
              ? "ثبّت الإضافة، اربط موقعك، ثم استخدم كل أدوات النشر وتحسين البحث من ووردبريس ومن حساب RankPublish."
              : "Install the plugin, pair your site, then use every publishing and SEO tool from WordPress and your RankPublish account."}
          </p>
        </div>
      </div>
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-16">
        {sections.map((section) => (
          <article key={section.title} className="rounded-[20px] border border-ink/10 bg-white p-6 shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
            <h2 className="text-lg font-bold">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-ink-soft">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
        <div className="flex flex-wrap gap-3">
          <Link href="/download" className="btn-gradient rounded-full px-5 py-3 text-sm font-bold">
            {copy.download}
          </Link>
          <Link href="/register" className="rounded-full border border-ink/15 px-5 py-3 text-sm font-bold">
            {copy.start}
          </Link>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
