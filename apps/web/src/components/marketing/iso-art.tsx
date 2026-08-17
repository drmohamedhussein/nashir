import type { ReactNode } from "react";
import {
  Blocks,
  CalendarDays,
  Gift,
  KeyRound,
  LayoutDashboard,
  Repeat,
  Share2,
  Timer,
  Unplug,
  WandSparkles,
} from "lucide-react";

const TOOL_TONES = [
  "from-[#4c7dff] to-[#7c5cff]",
  "from-[#22d3ee] to-[#2f5bff]",
  "from-[#f472b6] to-[#6b4cff]",
  "from-[#84cc16] to-[#22d3ee]",
  "from-[#2f5bff] to-[#0ea5e9]",
  "from-[#6b4cff] to-[#f472b6]",
  "from-[#38bdf8] to-[#6366f1]",
  "from-[#a3e635] to-[#2f5bff]",
  "from-[#818cf8] to-[#22d3ee]",
  "from-[#fb7185] to-[#6b4cff]",
];

const TOOL_ICONS = [Blocks, LayoutDashboard, WandSparkles, Repeat, KeyRound, Unplug, CalendarDays, Share2, Timer, Gift];

function Mini({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-white p-3 shadow-lg">{children}</div>;
}

function ToolPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <Mini>
        <div className="grid grid-cols-3 gap-1">
          <span className="col-span-1 h-16 rounded bg-slate-100" />
          <span className="col-span-2 space-y-1">
            <span className="block h-2 rounded bg-brand/70" />
            <span className="block h-8 rounded bg-slate-100" />
            <span className="block h-2 w-2/3 rounded bg-slate-200" />
          </span>
        </div>
      </Mini>
    );
  }
  if (index === 3) {
    return (
      <Mini>
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-ink-soft">
          <span className="rounded-md bg-slate-100 px-2 py-3">WP</span>
          <span className="h-px flex-1 bg-brand" />
          <span className="rounded-md bg-[#e8eeff] px-2 py-3 text-brand">Cloud</span>
        </div>
      </Mini>
    );
  }
  if (index === 9) {
    return (
      <Mini>
        <div className="grid h-14 place-items-center text-2xl font-extrabold text-brand">14</div>
      </Mini>
    );
  }
  return (
    <Mini>
      <div className="mb-2 h-1.5 w-10 rounded-full bg-brand" />
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }).map((_, cell) => (
          <span key={cell} className={`h-3 rounded ${cell % 3 === 0 ? "bg-brand/25" : "bg-slate-100"}`} />
        ))}
      </div>
    </Mini>
  );
}

export function ToolBanner({ index }: { index: number }) {
  const Icon = TOOL_ICONS[index] ?? Blocks;
  return (
    <div className={`relative h-28 overflow-hidden bg-linear-to-br ${TOOL_TONES[index]} p-4`}>
      <span className="absolute -end-8 -top-8 size-24 rounded-full bg-white/15" />
      <div className="relative flex h-full items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-md">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <ToolPreview index={index} />
        </div>
      </div>
    </div>
  );
}

const PLATFORM_TONES = [
  "bg-[#1877F2]",
  "bg-[#0f1419]",
  "bg-[#0a66c2]",
  "bg-[#e60023]",
  "bg-linear-to-br from-[#f58529] to-[#dd2a7b]",
  "bg-[#00ab6c]",
  "bg-[#111]",
  "bg-[#1a73e8]",
];

const PLATFORM_MARKS = ["f", "X", "in", "P", "Ig", "M", "Th", "G"];

export function PlatformMark({ index, name }: { index: number; name: string }) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white ${PLATFORM_TONES[index]}`}>
      {PLATFORM_MARKS[index] ?? name.slice(0, 1)}
    </span>
  );
}
