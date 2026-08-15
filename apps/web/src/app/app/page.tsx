import { PairingPanel } from "@/components/pairing-panel";
import { SiteCard } from "@/components/site-card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section>
        <h1 className="text-2xl font-bold">المواقع المرتبطة</h1>
        <p className="mt-2 text-sm text-ink-soft">كل موقع يظهر هنا بعد لصق رمز الربط في ووردبريس.</p>
        <div className="mt-6 space-y-3">
          {sites.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 p-8 text-sm text-ink-soft">
              لا يوجد موقع بعد. أنشئ رمزاً من العمود الأيسر.
            </p>
          ) : (
            sites.map((site) => (
              <SiteCard
                key={site.id}
                id={site.id}
                name={site.name}
                url={site.url}
                status={site.status}
                wpVersion={site.wpVersion}
                lastSeen={site.lastSeenAt ? site.lastSeenAt.toLocaleString("ar") : null}
              />
            ))
          )}
        </div>
      </section>
      <div className="space-y-4">
        <PairingPanel />
        <a
          href="/downloads/nashir.zip"
          className="block rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink-soft"
        >
          تنزيل إضافة ووردبريس
        </a>
      </div>
    </div>
  );
}
