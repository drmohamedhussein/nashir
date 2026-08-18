import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashPassword, randomToken } from "@/lib/crypto";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { PLANS, trialEnd } from "@/lib/plans";
import { acceptPendingInvites } from "@/lib/workspace";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(190),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "register"), 8, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً." }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير مكتملة." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  let exists;
  try {
    exists = await prisma.user.findUnique({ where: { email } });
  } catch {
    return NextResponse.json(
      { error: "قاعدة البيانات غير متاحة. تحقق من DATABASE_URL ثم أعد تشغيل التطبيق." },
      { status: 503 },
    );
  }

  if (exists) {
    return NextResponse.json({ error: "هذا البريد مسجّل مسبقاً." }, { status: 409 });
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + randomToken(4);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      workspace: {
        create: { name: parsed.data.name, slug },
      },
    },
    include: { workspace: true },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: user.workspace!.id,
      userId: user.id,
      role: "owner",
    },
  });

  const joinedWorkspaceId = await acceptPendingInvites(user.id, email);
  const sessionWorkspaceId = joinedWorkspaceId ?? user.workspace!.id;

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceId: sessionWorkspaceId,
  });

  if (joinedWorkspaceId) {
    return NextResponse.json({ ok: true, joinedWorkspace: true });
  }

  await prisma.subscription.create({
    data: {
      workspaceId: user.workspace!.id,
      planId: "starter",
      interval: PLANS.monthly.interval,
      status: "trial",
      priceCents: PLANS.monthly.priceCents,
      currentPeriodEnd: trialEnd(),
    },
  });

  return NextResponse.json({ ok: true });
}
