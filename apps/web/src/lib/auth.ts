import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "nashir_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
};

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) {
    return null;
  }

  let payload: { id: string; name: string; email: string; workspaceId: string };
  try {
    const verified = await jwtVerify(token, secretKey());
    const data = verified.payload;
    if (
      typeof data.id !== "string" ||
      typeof data.email !== "string" ||
      typeof data.name !== "string" ||
      typeof data.workspaceId !== "string"
    ) {
      return null;
    }
    payload = {
      id: data.id,
      name: data.name,
      email: data.email,
      workspaceId: data.workspaceId,
    };
  } catch {
    return null;
  }

  try {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: payload.workspaceId,
          userId: payload.id,
        },
      },
    });
    if (member) {
      return payload;
    }

    const owned = await prisma.workspace.findFirst({
      where: { ownerId: payload.id },
      select: { id: true },
    });
    const workspaceId = owned?.id ?? payload.workspaceId;
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId: payload.id },
      },
      create: { workspaceId, userId: payload.id, role: "owner" },
      update: {},
    });
    return { ...payload, workspaceId };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function getWorkspaceSites(workspaceId: string) {
  return prisma.site.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}
