import { describe, expect, it } from "vitest";
import { SubscriptionInactiveError } from "./subscription";

describe("subscription errors", () => {
  it("uses stable error code", () => {
    const error = new SubscriptionInactiveError();
    expect(error.code).toBe("SUBSCRIPTION_INACTIVE");
  });
});
