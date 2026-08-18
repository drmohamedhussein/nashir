export const PLANS = {
  monthly: {
    interval: "monthly" as const,
    priceCents: 999,
    labelAr: "9.99$ شهرياً",
    labelEn: "$9.99 / month",
  },
  yearly: {
    interval: "yearly" as const,
    priceCents: 9900,
    labelAr: "99$ سنوياً",
    labelEn: "$99 / year",
  },
};

export const TRIAL_DAYS = 7;

/** Single public plan — one WordPress site per subscription seat. */
export const STANDARD_PLAN_ID = "starter";

export const SEED_PLANS = [
  {
    id: STANDARD_PLAN_ID,
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
