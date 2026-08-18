import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { acceptPendingInvites, resolveSessionWorkspaceId } from "@/lib/workspace";
import { API_ERRORS } from "@/lib/api-errors";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "login"), 12, 15 * 60 * 1000)) {
    return NextResponse.json({ error: API_ERRORS.RATE_LIMIT }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: API_ERRORS.INCOMPLETE_DATA }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: API_ERRORS.INVALID_CREDENTIALS }, { status: 401 });
  }

  const joinedWorkspaceId = await acceptPendingInvites(user.id, email);
  const workspaceId = joinedWorkspaceId ?? (await resolveSessionWorkspaceId(user.id));
  if (!workspaceId) {
    return NextResponse.json({ error: API_ERRORS.NO_WORKSPACE }, { status: 403 });
  }

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    create: { workspaceId, userId: user.id, role: "owner" },
    update: {},
  });

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceId,
  });

  return NextResponse.json({ ok: true });
}
