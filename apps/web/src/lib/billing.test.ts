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
});
