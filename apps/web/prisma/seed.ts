import { PrismaClient } from "@prisma/client";
import { SEED_PLANS } from "../src/lib/plans";

const prisma = new PrismaClient();

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
      },
      create: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        siteLimit: plan.siteLimit,
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
        update: { quota: ent.quota },
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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
