const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SEED_PLANS = [
  {
    id: "starter",
    name: "RankPublish",
    description: "One WordPress site — calendar, scheduling, SEO, and social.",
    monthlyPriceCents: 999,
    yearlyPriceCents: 9900,
    siteLimit: 1,
    entitlements: [
      { capabilityKey: "schedule.calendar", quota: null },
      { capabilityKey: "schedule.queue", quota: null },
      { capabilityKey: "seo.audit", quota: 250 },
      { capabilityKey: "seo.metadata", quota: null },
    ],
  },
];

async function main() {
  for (const plan of SEED_PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        siteLimit: plan.siteLimit,
        isActive: true,
      },
      create: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        siteLimit: plan.siteLimit,
        isActive: true,
      },
    });

    for (const ent of plan.entitlements) {
      await prisma.planEntitlement.upsert({
        where: {
          planId_capabilityKey: {
            planId: plan.id,
            capabilityKey: ent.capabilityKey,
          },
        },
        update: { isIncluded: true, quota: ent.quota },
        create: {
          planId: plan.id,
          capabilityKey: ent.capabilityKey,
          isIncluded: true,
          quota: ent.quota,
        },
      });
    }
  }

  await prisma.plan.updateMany({
    where: { id: { in: ["growth", "scale"] } },
    data: { isActive: false },
  });

  console.log("Seeded plans:", SEED_PLANS.map((p) => p.id).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
