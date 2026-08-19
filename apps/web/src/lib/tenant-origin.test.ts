import { describe, expect, it } from "vitest";
import { API_ERRORS } from "./api-errors";
import { safeAppNextPath } from "./app-next";
import {
  customerSiteUrlOrError,
  isHqOrigin,
  originHost,
  readIntendedSite,
  rejectHqOrigin,
} from "./tenant-origin";

describe("tenant origin isolation", () => {
  it("treats nashir.satest.top and rankpublish.com as HQ", () => {
    expect(isHqOrigin("https://nashir.satest.top")).toBe(true);
    expect(isHqOrigin("https://www.nashir.satest.top/wp-admin")).toBe(true);
    expect(isHqOrigin("https://nashir.satest.top/wp-json/rankpublish/v1/")).toBe(true);
    expect(isHqOrigin("https://rankpublish.com")).toBe(true);
    expect(isHqOrigin("https://www.rankpublish.com/app")).toBe(true);
  });

  it("allows a customer zipwp origin", () => {
    expect(isHqOrigin("https://sunrider-silvy-cm95t.zipwp.xyz")).toBe(false);
    expect(originHost("https://sunrider-silvy-cm95t.zipwp.xyz/wp-admin")).toBe(
      "sunrider-silvy-cm95t.zipwp.xyz",
    );
    const ok = customerSiteUrlOrError("https://sunrider-silvy-cm95t.zipwp.xyz/");
    expect(ok).toEqual({ ok: true, url: "https://sunrider-silvy-cm95t.zipwp.xyz" });
    expect(customerSiteUrlOrError("https://client.example/blog/")).toEqual({
      ok: true,
      url: "https://client.example/blog",
    });
  });

  it("rejects HQ as a customer Site URL", () => {
    expect(customerSiteUrlOrError("https://nashir.satest.top")).toEqual({
      ok: false,
      error: API_ERRORS.HQ_SITE_BLOCKED,
    });
    expect(rejectHqOrigin("https://nashir.satest.top/wp-json/rankpublish/v1/")).toBe(
      API_ERRORS.HQ_SITE_BLOCKED,
    );
  });

  it("marks Continue siteUrl as blocked when it is HQ", () => {
    const intended = readIntendedSite("https://nashir.satest.top", "HQ");
    expect(intended.blocked).toBe(true);
    expect(intended.url).toBeNull();
  });

  it("reads Continue siteUrl for a customer WordPress origin", () => {
    const intended = readIntendedSite(
      "https://sunrider-silvy-cm95t.zipwp.xyz/",
      "sunrider",
    );
    expect(intended).toEqual({
      url: "https://sunrider-silvy-cm95t.zipwp.xyz",
      name: "sunrider",
      blocked: false,
    });
  });
});

describe("safe app next path", () => {
  it("keeps getting-started query including a customer siteUrl", () => {
    const next = "/app/getting-started?siteUrl=https://sunrider-silvy-cm95t.zipwp.xyz&siteName=Demo";
    expect(safeAppNextPath(next)).toBe(next);
  });

  it("rejects off-app and absolute URLs", () => {
    expect(safeAppNextPath("https://evil.example/app")).toBe("/app");
    expect(safeAppNextPath("//evil.example/app")).toBe("/app");
    expect(safeAppNextPath("/login")).toBe("/app");
  });
});
