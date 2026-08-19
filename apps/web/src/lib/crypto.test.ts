import { describe, expect, it } from "vitest";
import { hashSecret, secretMatches } from "./crypto";

describe("hashSecret", () => {
  it("hashes with AUTH_SECRET when set", () => {
    const previous = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "unit-test-secret";
    const digest = hashSecret("site-key");
    expect(digest).toHaveLength(64);
    expect(secretMatches(digest, "site-key")).toBe(true);
    expect(secretMatches(digest, "other-key")).toBe(false);
    if (previous === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = previous;
    }
  });

  it("still accepts hashes made with the legacy pepper", () => {
    const previous = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    const legacy = hashSecret("site-key");
    process.env.AUTH_SECRET = "unit-test-secret";
    expect(secretMatches(legacy, "site-key")).toBe(true);
    if (previous === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = previous;
    }
  });
});
