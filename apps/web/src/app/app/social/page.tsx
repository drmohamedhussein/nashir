import { SocialPanel } from "@/components/social-panel";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SocialPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId },
    include: {
      socialAccounts: true,
      socialTemplates: true,
      shareJobs: { take: 12, orderBy: { createdAt: "desc" } },
    },
  });

  const locale = await getLocale();
  const copy = t(locale);

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.social}</h1>
      <SocialPanel
        locale={locale}
        sites={sites.map((site) => ({
          id: site.id,
          name: site.name,
          accounts: site.socialAccounts,
          templates: site.socialTemplates,
          jobs: site.shareJobs,
        }))}
      />
    </div>
  );
}
