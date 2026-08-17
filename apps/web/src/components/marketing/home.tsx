import Link from "next/link";
import { Blocks, Building2, CalendarDays, Cloud, FilePenLine, PenLine, Repeat, Share2, Shield, Users } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { ArtFrame, Reveal } from "./motion";
import { HeroVisual } from "./hero-visual";
import { FeatureScene, type FeatureSceneId } from "./feature-scene";
import { PlatformMark, ToolBanner } from "./iso-art";

type FeatureVisual = { src: string } | { scene: FeatureSceneId };

export function HomeLanding({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const features: Array<{ k: string; t: string; b: string; icon: typeof CalendarDays; visual: FeatureVisual }> = [
    { k: copy.f1k, t: copy.f1t, b: copy.f1b, icon: CalendarDays, visual: { scene: "calendar" } },
    { k: copy.f2k, t: copy.f2t, b: copy.f2b, icon: Repeat, visual: { src: "/art/schedule.jpg" } },
    { k: copy.f3k, t: copy.f3t, b: copy.f3b, icon: Share2, visual: { src: "/art/social.jpg" } },
    { k: copy.f4k, t: copy.f4t, b: copy.f4b, icon: Shield, visual: { scene: "reliability" } },
    { k: copy.f5k, t: copy.f5t, b: copy.f5b, icon: FilePenLine, visual: { scene: "templates" } },
    { k: copy.f6k, t: copy.f6t, b: copy.f6b, icon: Blocks, visual: { scene: "editors" } },
  ];
  const stats = [
    { n: copy.stat1n, l: copy.stat1l, icon: Cloud },
    { n: copy.stat2n, l: copy.stat2l, icon: CalendarDays },
    { n: copy.stat3n, l: copy.stat3l, icon: Share2 },
  ];
  const who = [
    { t: copy.who1t, b: copy.who1b, icon: PenLine },
    { t: copy.who2t, b: copy.who2b, icon: Users },
    { t: copy.who3t, b: copy.who3b, icon: Building2 },
  ];
  const planItems = [copy.p1, copy.p2, copy.p3, copy.p4, copy.p5, copy.p6, copy.p7, copy.p8];

  return (
    <div className="bg-white">
      <section className="hero-gradient relative overflow-hidden pb-16 pt-10">
        <span className="orb-3d pointer-events-none top-10 end-[6%] hidden h-36 w-36 bg-brand/20 lg:block" />
        <span className="orb-3d pointer-events-none bottom-24 start-[4%] hidden h-24 w-24 bg-purple/20 lg:block" style={{ animationDelay: "-3s" }} />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="mb-3 text-sm font-bold tracking-wide text-brand uppercase">{copy.tagline}</p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">{copy.heroTitle}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-ink-soft">{copy.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-gradient rounded-full px-5 py-3 text-sm font-bold">
                {copy.ctaFree}
              </Link>
              <Link href="/pricing" className="rounded-full border border-ink/15 bg-white/80 px-5 py-3 text-sm font-bold backdrop-blur">
                {copy.pricing}
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
        <div className="relative z-10 mx-auto mt-14 grid max-w-6xl gap-4 px-6 md:grid-cols-3">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.n} className="flex gap-3.5 rounded-[18px] bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand to-purple text-white">
                  <Icon size={20} />
                </div>
                <div>
                  <strong className="block text-lg">{item.n}</strong>
                  <span className="text-sm text-ink-soft">{item.l}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <p className="text-sm font-bold tracking-wide text-brand uppercase">{copy.featuresK}</p>
          <h2 className="mt-2 text-3xl font-bold">{copy.featuresH}</h2>
        </Reveal>
        <div className="mt-10 space-y-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const text = (
              <div>
                <div className="mb-4 grid size-12 place-items-center rounded-[14px] bg-[#e8eeff] text-brand">
                  <Icon size={22} />
                </div>
                <p className="text-sm font-bold tracking-wide text-brand uppercase">{feature.k}</p>
                <h3 className="mt-2 text-2xl font-bold">{feature.t}</h3>
                <p className="mt-3 max-w-lg text-ink-soft">{feature.b}</p>
              </div>
            );
            const visual =
              "src" in feature.visual ? (
                <div className="min-w-0">
                  <ArtFrame src={feature.visual.src} alt={feature.t} />
                </div>
              ) : (
                <FeatureScene id={feature.visual.scene} />
              );
            const odd = index % 2 === 0;
            return (
              <Reveal key={feature.t}>
                <div className="grid items-center gap-12 lg:grid-cols-2">
                  {odd ? text : visual}
                  {odd ? visual : text}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="bg-paper py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className="text-sm font-bold tracking-wide text-brand uppercase">{copy.toolsK}</p>
            <h2 className="mt-2 text-3xl font-bold">{copy.toolsH}</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {copy.tools.map((tool, index) => (
              <Reveal key={tool.title}>
                <article className="overflow-hidden rounded-[20px] bg-white shadow-[0_16px_40px_rgba(11,22,56,0.08)]">
                  <ToolBanner index={index} />
                  <div className="p-5">
                    <h3 className="font-bold">{tool.title}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{tool.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <Reveal>
          <p className="text-sm font-bold tracking-wide text-brand uppercase">{copy.priceK}</p>
          <h2 className="mt-2 text-3xl font-bold">{copy.priceH}</h2>
          <p className="mt-3 text-ink-soft">{copy.trialNote}</p>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 text-start md:grid-cols-2">
          <Reveal>
            <article className="flex h-full flex-col gap-2 rounded-[22px] bg-white p-8 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
              <h3 className="text-lg font-bold">{copy.monthly}</h3>
              <p className="text-5xl font-extrabold tracking-tight">{copy.monthlyPrice}</p>
              <p className="text-sm text-ink-soft">{copy.perSite}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {planItems.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
              <Link href="/register" className="mt-auto inline-flex rounded-full bg-brand px-4 py-2 text-center text-sm font-bold text-white">
                {copy.choosePlan}
              </Link>
            </article>
          </Reveal>
          <Reveal>
            <article className="relative flex h-full flex-col gap-2 rounded-[22px] bg-[#1e3a8a] p-8 text-white shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
              <span className="absolute top-4 end-4 rounded-full bg-purple px-2.5 py-1 text-xs font-bold">{copy.popular}</span>
              <h3 className="text-lg font-bold">{copy.yearly}</h3>
              <p className="text-5xl font-extrabold tracking-tight">{copy.yearlyPrice}</p>
              <p className="text-sm text-white/80">{copy.perSite}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/85">
                {planItems.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
              <Link href="/register" className="mt-auto inline-flex rounded-full bg-white px-4 py-2 text-center text-sm font-bold text-brand">
                {copy.choosePlan}
              </Link>
            </article>
          </Reveal>
        </div>
        <p className="mt-12 text-sm font-bold tracking-wide text-brand uppercase">{copy.platformsH}</p>
        <div className="mt-6 grid gap-3 text-start sm:grid-cols-2 lg:grid-cols-4">
          {copy.platforms.map((platform, index) => (
            <article key={platform.name} className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(11,22,56,0.06)]">
              <PlatformMark index={index} name={platform.name} />
              <div>
                <h3 className="font-bold">{platform.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{platform.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-paper py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="trial-banner relative grid items-center gap-6 overflow-hidden rounded-[28px] p-10 text-white md:grid-cols-[1.05fr_0.95fr]">
              <div className="relative z-10">
                <p className="text-sm font-bold tracking-wide text-[#7cffb2] uppercase">{copy.trialK}</p>
                <h2 className="mt-2 text-3xl font-bold">{copy.trialH}</h2>
                <p className="mt-3 text-white/80">{copy.trialB}</p>
                <Link href="/register" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-brand">
                  {copy.start}
                </Link>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/art/character.jpg" alt="" className="relative z-10 max-h-72 justify-self-center rounded-[22px] object-cover shadow-2xl" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <p className="text-sm font-bold tracking-wide text-brand uppercase">{copy.whoK}</p>
          <h2 className="mt-2 text-3xl font-bold">{copy.whoH}</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {who.map((item) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.t}>
                <article className="rounded-[20px] bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
                  <div className="mb-3.5 grid size-12 place-items-center rounded-2xl bg-[#e8eeff] text-brand">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-bold">{item.t}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{item.b}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-10 text-center text-sm font-bold tracking-wide text-brand uppercase">{copy.trustH}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-7 text-sm font-extrabold tracking-wide text-slate-400">
          <span>WordPress</span>
          <span>Gutenberg</span>
          <span>Elementor</span>
          <span>Facebook</span>
          <span>LinkedIn</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal>
          <div className="cta-finale rounded-[28px] px-8 py-14 text-center text-navy">
            <h2 className="text-3xl font-bold">{copy.bottomH}</h2>
            <p className="mx-auto mt-3 max-w-xl text-navy/70">{copy.bottomB}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="rounded-full bg-navy px-5 py-3 text-sm font-bold text-white">
                {copy.ctaStarted}
              </Link>
              <Link href="/download" className="rounded-full border border-navy/15 bg-white px-5 py-3 text-sm font-bold">
                {copy.download}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
