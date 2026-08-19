import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isPayPalConfigured } from "./billing";

describe("billing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("detects PayPal when client credentials are set", async () => {
    process.env.PAYPAL_CLIENT_ID = "AbCdEfGhIjKlMnOp";
    process.env.PAYPAL_CLIENT_SECRET = "secret1234567890";
    const { isPayPalConfigured: configured } = await import("./billing");
    expect(configured()).toBe(true);
  });

  it("returns false when PayPal credentials are missing", () => {
    process.env.PAYPAL_CLIENT_ID = "";
    process.env.PAYPAL_CLIENT_SECRET = "";
    expect(isPayPalConfigured()).toBe(false);
  });

  it("formats public prices as $9.99 not $9.90", async () => {
    const { formatUsdFromCents, publicListPriceCents } = await import("./billing-display");
    expect(publicListPriceCents(990)).toBe(999);
    expect(formatUsdFromCents(999)).toBe("$9.99");
    expect(formatUsdFromCents(9900)).toBe("$99");
  });

  it("strips spaces from stored site URLs", async () => {
    const { siteDisplayUrl } = await import("./billing-display");
    expect(siteDisplayUrl("https://dreamshaper dumoulin rh.zipwp.site")).toBe(
      "https://dreamshaperdumoulinrh.zipwp.site",
    );
    expect(siteDisplayUrl(null)).toBeNull();
  });
});
