import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { TeamPanel } from "@/components/rankpublish/team-panel";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const copy = t(locale);

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: session.workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId: session.workspaceId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{copy.team ?? "Team"}</h1>
      <p className="mt-2 text-sm text-ink-soft">{copy.teamHint ?? "Manage workspace members and invitations."}</p>
      <TeamPanel
        members={members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        }))}
        invites={invites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt.toISOString(),
        }))}
        currentUserId={session.id}
        workspaceId={session.workspaceId}
        locale={locale}
      />
    </div>
  );
}
