import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    include: { entitlements: true },
    orderBy: { monthlyPriceCents: "asc" },
  });

  return NextResponse.json({
    ok: true,
    data: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      monthlyPriceCents: p.monthlyPriceCents,
      yearlyPriceCents: p.yearlyPriceCents,
      siteLimit: p.siteLimit,
      entitlements: p.entitlements.map((e) => ({
        capabilityKey: e.capabilityKey,
        quota: e.quota,
      })),
    })),
  });
}
