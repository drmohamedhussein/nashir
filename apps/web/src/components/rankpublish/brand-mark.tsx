import { cn } from "@/lib/utils";

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label="RankPublish"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="rp-web-bg" x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="rp-web-bars" x1="18" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a5b4fc" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#rp-web-bg)" />
      <rect x="7" y="9" width="9.5" height="14" rx="2.2" fill="#fff" fillOpacity="0.97" />
      <rect x="8.8" y="11.8" width="6.2" height="1.5" rx="0.75" fill="#4338ca" fillOpacity="0.22" />
      <rect x="8.8" y="14.6" width="6.2" height="1.5" rx="0.75" fill="#4338ca" fillOpacity="0.16" />
      <rect x="8.8" y="17.4" width="4.2" height="1.5" rx="0.75" fill="#4338ca" fillOpacity="0.1" />
      <rect x="19.2" y="18.2" width="2.5" height="4.8" rx="1.25" fill="url(#rp-web-bars)" fillOpacity="0.7" />
      <rect x="22.5" y="14.8" width="2.5" height="8.2" rx="1.25" fill="url(#rp-web-bars)" fillOpacity="0.88" />
      <rect x="25.8" y="11" width="2.5" height="12" rx="1.25" fill="url(#rp-web-bars)" />
      <path d="M26.05 10.2 26.05 7.4 28.55 10.2Z" fill="#ecfeff" />
    </svg>
  );
}

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoIcon className="size-9 shrink-0 rounded-xl shadow-[0_10px_24px_rgba(99,102,241,0.28)]" />
      {!compact ? (
        <span>
          <span className="block text-[15px] font-extrabold tracking-[-0.04em] text-current">RankPublish</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-sky-200/80">Publishing OS</span>
        </span>
      ) : null}
    </span>
  );
}
