import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function HomePage() {
  return (
    <div className="min-h-full">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-8">
        <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-medium tracking-wide text-gold-deep">
              تقويم تحريري سحابي لمواقع ووردبريس
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              انشر في موعده. من موقعك أو من ناشر.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-ink-soft">
              ناشر حسابك المركزي للتقويم والمواعيد وحالة كل موقع، مع موصل ووردبريس أصلي ينفّذ النشر
              بتوقيع آمن. الإصدار العام الحالي مجاني أثناء التجربة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-leaf px-5 py-3 text-sm font-semibold text-white"
              >
                إنشاء حساب
              </Link>
              <Link
                href="/download"
                className="rounded-full border border-ink/15 px-5 py-3 text-sm"
              >
                تنزيل إضافة ووردبريس
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-ink/10 bg-paper-deep p-6 shadow-[0_20px_60px_rgba(18,33,28,0.08)]">
            <div className="mb-4 flex items-center justify-between text-sm text-ink-soft">
              <span>التقويم</span>
              <span className="rounded-full bg-white px-3 py-1 text-leaf">سحابة النشر جاهزة</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-ink-soft">
              {["س", "ح", "ن", "ث", "ر", "خ", "ج"].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: 31 }, (_, index) => {
                const day = index + 1;
                const featured = day === 15 || day === 18 || day === 22;
                return (
                  <div
                    key={day}
                    className={`min-h-16 rounded-xl p-2 text-right ${featured ? "bg-white" : ""}`}
                  >
                    <div className="text-[11px]">{day}</div>
                    {day === 15 ? (
                      <div className="mt-2 rounded-md bg-leaf/10 px-1 py-1 text-[10px] text-leaf">
                        مقال رأي
                      </div>
                    ) : null}
                    {day === 18 ? (
                      <div className="mt-2 rounded-md bg-gold/15 px-1 py-1 text-[10px] text-gold-deep">
                        تقرير
                      </div>
                    ) : null}
                    {day === 22 ? (
                      <div className="mt-2 rounded-md bg-ink/10 px-1 py-1 text-[10px]">مسودة</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="grid gap-6 border-t border-ink/10 pt-12 md:grid-cols-3">
          {[
            {
              title: "حساب واحد لكل مواقعك",
              body: "اربط أكثر من موقع ووردبريس بنفس مساحة العمل، وتابع الحالة من لوحة ناشر.",
            },
            {
              title: "النشر لا يعتمد على نوم الموقع",
              body: "المواعيد تُعالَج من السحابة، والموقع يرسل نبضة كل دقيقة حتى لا يضيع الموعد.",
            },
            {
              title: "موصل أصلي",
              body: "كود ووردبريس مكتوب لناشر من الصفر: ربط برمز، REST موقّع، ومزامنة المقالات.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl bg-white/70 p-6">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-ink-soft">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
