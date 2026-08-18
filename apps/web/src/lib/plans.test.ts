import { describe, expect, it } from "vitest";
import { isSubscriptionLive, periodEnd, trialEnd, TRIAL_DAYS } from "./plans";

describe("plans", () => {
  it("marks trial subscriptions as live before period end", () => {
    const end = trialEnd();
    expect(isSubscriptionLive("trial", end)).toBe(true);
  });

  it("marks expired subscriptions as inactive", () => {
    expect(isSubscriptionLive("trial", new Date("2020-01-01T00:00:00Z"))).toBe(false);
  });

  it("extends monthly period by one month", () => {
    const start = new Date("2026-01-15T12:00:00Z");
    const end = periodEnd("monthly", start);
    expect(end.getMonth()).toBe(1);
  });

  it("uses configured trial length", () => {
    expect(TRIAL_DAYS).toBe(7);
  });
});
