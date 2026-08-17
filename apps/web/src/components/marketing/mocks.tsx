import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function CalendarMock({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const days = locale === "ar" ? ["س", "ح", "ن", "ث", "ر", "خ", "ج"] : ["S", "S", "M", "T", "W", "T", "F"];
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
      <div className="flex gap-1.5 bg-paper-deep px-4 py-3">
        <i className="size-2.5 rounded-full bg-[#ff7b7b]" />
        <i className="size-2.5 rounded-full bg-[#c9d2ea]" />
        <i className="size-2.5 rounded-full bg-[#c9d2ea]" />
      </div>
      <div className="grid grid-cols-7 gap-2 p-4 text-center text-xs">
        {days.map((day, index) => (
          <span key={`${day}-${index}`} className="font-bold text-ink-soft/70">
            {day}
          </span>
        ))}
        {Array.from({ length: 28 }, (_, index) => {
          const day = index + 1;
          const featured = day === 8 || day === 15 || day === 22;
          return (
            <div key={day} className={`min-h-[52px] rounded-[10px] p-1.5 ${featured ? "bg-linear-to-b from-[#eef2ff] to-white shadow-[inset_0_0_0_1px_rgba(47,91,255,0.18)]" : "bg-paper"}`}>
              <div className="text-[11px]">{day}</div>
              {day === 8 ? <div className="mt-1 rounded bg-[#e8eeff] px-1 py-0.5 text-[10px] font-bold text-brand">publish</div> : null}
              {day === 15 ? <div className="mt-1 rounded bg-[#efe8ff] px-1 py-0.5 text-[10px] font-bold text-purple">future</div> : null}
              {day === 22 ? <div className="mt-1 rounded bg-[#e7f9ee] px-1 py-0.5 text-[10px] font-bold text-green-700">draft</div> : null}
            </div>
          );
        })}
      </div>
      <span className="sr-only">{copy.calendar}</span>
    </div>
  );
}

export function ScheduleMock({ title }: { title: string }) {
  const rows = [
    ["08:00", "publish"],
    ["11:30", "future"],
    ["16:00", "draft"],
    ["19:15", "social"],
  ];
  return (
    <div className="min-h-[280px] rounded-3xl bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
      <div className="mb-4 flex items-center justify-between text-sm font-bold">
        {title}
        <span className="rounded-full bg-[#e8eeff] px-2.5 py-0.5 text-[11px] font-bold text-brand">auto</span>
      </div>
      {rows.map((row) => (
        <div key={row[0]} className="flex justify-between border-b border-ink/10 py-3 text-sm">
          <span>{row[0]}</span>
          <span className="rounded-full bg-[#e8eeff] px-2.5 py-0.5 text-[11px] font-bold text-brand">{row[1]}</span>
        </div>
      ))}
    </div>
  );
}

export function SocialMock({ title, names }: { title: string; names: readonly string[] }) {
  return (
    <div className="min-h-[280px] rounded-3xl bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
      <div className="mb-4 text-sm font-bold">{title}</div>
      <div className="grid grid-cols-2 gap-2.5">
        {names.map((name) => (
          <b key={name} className="block rounded-[14px] bg-paper p-4 text-sm font-semibold">
            {name}
          </b>
        ))}
      </div>
    </div>
  );
}

export function BarsMock({ title }: { title: string }) {
  return (
    <div className="min-h-[280px] rounded-3xl bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
      <div className="mb-4 text-sm font-bold">{title}</div>
      <div className="grid gap-2.5">
        {["82%", "64%", "91%", "48%"].map((width) => (
          <div key={width} className="h-2.5 overflow-hidden rounded-full bg-paper">
            <span className="block h-full rounded-full bg-linear-to-r from-brand to-purple" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplatesMock() {
  return (
    <div className="min-h-[280px] rounded-3xl bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
      <div className="mb-4 text-sm font-bold">{"{title} · {url}"}</div>
      {[
        ["Facebook", "{excerpt}"],
        ["X", "{title}"],
        ["LinkedIn", "{excerpt}"],
      ].map((row) => (
        <div key={row[0]} className="flex justify-between border-b border-ink/10 py-3 text-sm">
          <span>{row[0]}</span>
          <span className="rounded-full bg-[#e8eeff] px-2.5 py-0.5 text-[11px] font-bold text-brand">{row[1]}</span>
        </div>
      ))}
    </div>
  );
}

export function EditorsMock({ title }: { title: string }) {
  return (
    <div className="min-h-[280px] rounded-3xl bg-white p-6 shadow-[0_22px_50px_rgba(47,91,255,0.12)]">
      <div className="mb-4 text-sm font-bold">{title}</div>
      {["Gutenberg", "Classic", "Elementor"].map((name) => (
        <div key={name} className="flex justify-between border-b border-ink/10 py-3 text-sm">
          <span>{name}</span>
          <span className="rounded-full bg-[#e8eeff] px-2.5 py-0.5 text-[11px] font-bold text-brand">ok</span>
        </div>
      ))}
    </div>
  );
}
