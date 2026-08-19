import { SettingsForm } from "@/components/settings-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const sites = await prisma.site.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const locale = await getLocale();
  const copy = t(locale);

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.settings}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.settingsHint}</p>
      <SettingsForm sites={sites} locale={locale} />
    </div>
  );
}
