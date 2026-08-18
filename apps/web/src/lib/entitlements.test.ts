import { describe, expect, it } from "vitest";
import { resolveActionCapability } from "./entitlements";

describe("entitlements", () => {
  it("maps seo audit actions to seo.audit capability", () => {
    expect(resolveActionCapability("seo.audit.run")).toBe("seo.audit");
  });

  it("maps publishing actions to schedule.calendar", () => {
    expect(resolveActionCapability("publishing.post.write")).toBe("schedule.calendar");
  });

  it("passes through unknown actions unchanged", () => {
    expect(resolveActionCapability("custom.action")).toBe("custom.action");
  });
});
