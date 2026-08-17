import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-300 to-indigo-400 text-sm font-black text-[#0b1530] shadow-[0_10px_24px_rgba(56,189,248,.25)]">
        R
      </span>
      {!compact ? (
        <span>
          <span className="block text-[15px] font-extrabold tracking-[-0.04em] text-current">RankPublish</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-sky-200/80">Publishing OS</span>
        </span>
      ) : null}
    </span>
  );
}
