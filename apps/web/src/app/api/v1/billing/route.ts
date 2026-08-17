import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, trialEnd } from "@/lib/plans";

const schema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { workspaceId: session.workspaceId },
    include: { site: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    plans: PLANS,
    subscriptions: subscriptions.map((row) => ({
      id: row.id,
      interval: row.interval,
      status: row.status,
      priceCents: row.priceCents,
      currentPeriodEnd: row.currentPeriodEnd.toISOString(),
      siteId: row.siteId,
      siteUrl: row.site?.url ?? null,
      siteName: row.site?.name ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "خطة غير صالحة." }, { status: 400 });
  }

  const plan = PLANS[parsed.data.interval];
  const seat = await prisma.subscription.create({
    data: {
      workspaceId: session.workspaceId,
      interval: plan.interval,
      status: "trial",
      priceCents: plan.priceCents,
      currentPeriodEnd: trialEnd(),
    },
  });

  return NextResponse.json({ ok: true, id: seat.id });
}
