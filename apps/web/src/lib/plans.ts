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

export const TRIAL_DAYS = 14;

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
