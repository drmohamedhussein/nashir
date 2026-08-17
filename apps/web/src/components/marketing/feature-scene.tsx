"use client";

import { Blocks, CalendarDays, CheckCircle2, Clock, FilePenLine, Shield, Type } from "lucide-react";

const scenes = {
  calendar: {
    icon: CalendarDays,
    accent: "from-[#2f5bff] to-[#6b4cff]",
    days: ["82%", "40%", "91%", "28%", "74%", "55%", "63%", "18%", "88%", "46%", "70%", "33%"],
  },
  reliability: {
    icon: Shield,
    accent: "from-[#1e3a8a] to-[#2f5bff]",
    bars: ["82%", "64%", "91%", "48%"],
  },
  templates: {
    icon: FilePenLine,
    accent: "from-[#6b4cff] to-[#f472b6]",
    rows: ["Facebook · {excerpt}", "X · {title}", "LinkedIn · {excerpt}"],
  },
  editors: {
    icon: Blocks,
    accent: "from-[#0ea5e9] to-[#84cc16]",
    rows: ["Gutenberg", "Classic", "Elementor"],
  },
} as const;

export type FeatureSceneId = keyof typeof scenes;

export function FeatureScene({ id }: { id: FeatureSceneId }) {
  const scene = scenes[id];
  const Icon = scene.icon;

  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-linear-to-br ${scene.accent} p-8 shadow-[0_30px_80px_rgba(47,91,255,0.18)]`}>
      <span className="absolute -end-8 -top-10 size-32 rounded-full bg-white/15" />
      <span className="absolute -start-6 bottom-4 size-20 rounded-[18px] bg-white/10" />
      <div className="relative rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-brand">
          <Icon size={22} />
        </div>
        {id === "calendar" && "days" in scene ? (
          <div className="grid grid-cols-7 gap-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span key={`dow-${index}`} className="text-center text-[10px] font-bold text-ink-soft">
                {day}
              </span>
            ))}
            {scene.days.map((fill, index) => (
              <span key={`${fill}-${index}`} className="h-8 rounded-md bg-slate-100 p-1">
                {index % 3 === 0 ? <span className="block h-2 rounded-sm bg-brand" style={{ width: fill }} /> : null}
                {index % 4 === 1 ? <span className="mt-1 block h-2 rounded-sm bg-purple" style={{ width: "55%" }} /> : null}
              </span>
            ))}
          </div>
        ) : null}
        {"bars" in scene
          ? scene.bars.map((width) => (
              <div key={width} className="mb-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-brand" style={{ width }} />
              </div>
            ))
          : null}
        {"rows" in scene
          ? scene.rows.map((row) => (
              <div key={row} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  {id === "editors" ? <CheckCircle2 size={14} className="text-lime" /> : <Type size={14} className="text-purple" />}
                  {row}
                </span>
                {id === "editors" ? <Clock size={14} className="text-ink-soft" /> : null}
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
