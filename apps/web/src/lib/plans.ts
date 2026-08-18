export const PLANS = {
  monthly: {
    interval: "monthly" as const,
    priceCents: 990,
    labelAr: "9.90$ شهرياً",
    labelEn: "$9.90 / month",
  },
  yearly: {
    interval: "yearly" as const,
    priceCents: 9900,
    labelAr: "99$ سنوياً",
    labelEn: "$99 / year",
  },
};

export const TRIAL_DAYS = 7;

export const SEED_PLANS = [
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

export function periodEnd(interval: "monthly" | "yearly", from = new Date()): Date {
  const end = new Date(from);
  if (interval === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export function trialEnd(from = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

export function isSubscriptionLive(status: string, currentPeriodEnd: Date): boolean {
  return ["trial", "active", "manual"].includes(status) && currentPeriodEnd > new Date();
}
