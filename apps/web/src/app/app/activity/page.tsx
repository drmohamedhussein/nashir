import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  running: "bg-sky-50 text-sky-700 border-sky-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const copy = t(locale);

  const events = await prisma.activityEvent.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { site: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.activity ?? "Activity"}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.activityHint ?? "Recent workspace operations and events."}</p>

      {events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center text-sm text-ink-soft">
          {copy.activityEmpty}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(11,22,56,0.03)]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                {ev.detail && <p className="mt-1 text-xs text-slate-500">{ev.detail}</p>}
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                  {ev.site && <span>{ev.site.name}</span>}
                  <span>{ev.createdAt.toLocaleString(locale)}</span>
                </div>
              </div>
              <span className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase",
                STATUS_STYLES[ev.status] ?? STATUS_STYLES.pending,
              )}>
                {ev.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
