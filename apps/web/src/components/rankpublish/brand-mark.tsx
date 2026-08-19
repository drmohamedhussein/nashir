import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/logo-icon.png"
        alt="RankPublish"
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-xl shadow-[0_10px_24px_rgba(99,102,241,0.28)]"
        priority
      />
      {!compact ? (
        <span>
          <span className="block text-[15px] font-extrabold tracking-[-0.04em] text-current">RankPublish</span>
          <span className="mt-0.5 block text-[7px] font-bold uppercase tracking-[0.12em] text-sky-200/80">Publish. Optimize. Rank.</span>
        </span>
      ) : null}
    </span>
  );
}
