const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SEED_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "For focused publishing workflows on a single site.",
    monthlyPriceCents: 990,
    yearlyPriceCents: 9900,
    siteLimit: 1,
    entitlements: [
      { capabilityKey: "schedule.calendar", quota: null },
      { capabilityKey: "seo.audit", quota: 25 },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams managing several WordPress properties.",
    monthlyPriceCents: 2900,
    yearlyPriceCents: 29000,
    siteLimit: 5,
    entitlements: [
      { capabilityKey: "schedule.calendar", quota: null },
      { capabilityKey: "schedule.queue", quota: null },
      { capabilityKey: "seo.audit", quota: 250 },
      { capabilityKey: "seo.metadata", quota: null },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    description: "For advanced publishing and SEO operations at scale.",
    monthlyPriceCents: 4900,
    yearlyPriceCents: 49000,
    siteLimit: 15,
    entitlements: [
      { capabilityKey: "schedule.calendar", quota: null },
      { capabilityKey: "schedule.queue", quota: null },
      { capabilityKey: "seo.audit", quota: null },
      { capabilityKey: "seo.metadata", quota: null },
      { capabilityKey: "operations.priority", quota: null },
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

  console.log("Seeded plans and entitlements.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
