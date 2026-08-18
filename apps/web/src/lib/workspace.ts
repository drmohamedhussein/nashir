import { prisma } from "./db";
import { randomToken, digestToken } from "./crypto";

export async function listWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => ({
    workspace: { id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug },
    role: m.role,
  }));
}

export async function getWorkspaceSummary(userId: string, workspaceId: string) {
  await assertMember(userId, workspaceId);
  const [siteCount, memberCount, sub] = await Promise.all([
    prisma.site.count({ where: { workspaceId } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.subscription.findFirst({ where: { workspaceId }, include: { plan: true } }),
  ]);
  return {
    siteCount,
    memberCount,
    plan: sub?.plan ?? null,
    subscriptionStatus: sub?.status ?? null,
    renewalDate: sub?.renewalDate ?? sub?.currentPeriodEnd ?? null,
  };
}

export async function assertMember(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) {
    throw new Error("Access denied: not a member of this workspace");
  }
  return member;
}

export async function assertRole(userId: string, workspaceId: string, minRole: string) {
  const member = await assertMember(userId, workspaceId);
  const hierarchy = ["viewer", "member", "admin", "owner"];
  if (hierarchy.indexOf(member.role) < hierarchy.indexOf(minRole)) {
    throw new Error(`Access denied: requires ${minRole} role`);
  }
  return member;
}

export async function createWorkspaceForUser(userId: string, name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + randomToken(4);

  const workspace = await prisma.workspace.create({
    data: { name, slug, ownerId: userId },
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId, role: "owner" },
  });

  return workspace;
}

export async function inviteMember(
  actorId: string,
  workspaceId: string,
  email: string,
  role: string,
) {
  await assertRole(actorId, workspaceId, "admin");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.workspaceInvite.create({
    data: { workspaceId, email, role, invitedById: actorId, expiresAt },
  });
}

export async function listMembers(userId: string, workspaceId: string) {
  await assertMember(userId, workspaceId);
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function removeMember(actorId: string, workspaceId: string, targetUserId: string) {
  await assertRole(actorId, workspaceId, "admin");
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
  if (!target || target.role === "owner") {
    throw new Error("Cannot remove workspace owner");
  }
  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
}

export async function createSiteInWorkspace(
  userId: string,
  workspaceId: string,
  data: { name: string; url: string },
) {
  await assertRole(userId, workspaceId, "member");

  const token = randomToken(32);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  const site = await prisma.site.create({
    data: {
      workspaceId,
      name: data.name,
      url: data.url,
      restUrl: `${new URL(data.url).origin}/wp-json/`,
      apiKeyHash: "",
      signingSecret: "",
      connectionTokenHash: digestToken(token),
      tokenExpiresAt: expiresAt,
      status: "pending",
      workerStatus: "none",
    },
  });

  return { site, token, expiresAt };
}

export async function regenerateSiteToken(userId: string, workspaceId: string, siteId: string) {
  await assertRole(userId, workspaceId, "member");
  const token = randomToken(32);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  await prisma.site.update({
    where: { id: siteId },
    data: {
      connectionTokenHash: digestToken(token),
      tokenExpiresAt: expiresAt,
      status: "pending",
    },
  });

  return { token, expiresAt };
}

export async function disconnectSite(userId: string, workspaceId: string, siteId: string) {
  await assertRole(userId, workspaceId, "admin");
  await prisma.site.update({
    where: { id: siteId },
    data: {
      status: "disconnected",
      connectionTokenHash: null,
      tokenExpiresAt: null,
      bridgeSecretHash: null,
      signingSecret: "",
      apiKeyHash: "",
    },
  });
}
