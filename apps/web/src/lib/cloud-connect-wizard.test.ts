import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("RankPublish Cloud Connect wizard", () => {
  const admin = read("apps/rankpublish/includes/connector/class-admin.php");
  const onboarding = read("apps/rankpublish/includes/connector/class-onboarding.php");
  const cssPath = "apps/rankpublish/assets/cloud-connect.css";

  it("does not list merged plugin versions on the Cloud Connect page", () => {
    expect(admin).not.toMatch(/Integrations on this site/);
    expect(admin).not.toMatch(/integration_manifest\(\)/);
    expect(onboarding).not.toMatch(/Integrations on this site/);
  });

  it("renders a ThinkRank-style setup wizard chrome for pairing", () => {
    expect(onboarding).toMatch(/rp-wizard/);
    expect(onboarding).toMatch(/rp-wizard__stepper/);
    expect(onboarding).toMatch(/rp-wizard__panel/);
    expect(admin).toMatch(/rankpublish-cloud-wizard/);
    expect(admin).toMatch(/cloud-connect\.css/);
  });

  it("keeps pairing and disconnect actions", () => {
    expect(admin).toMatch(/rankpublish_connect/);
    expect(admin).toMatch(/rankpublish_disconnect/);
    expect(admin).toMatch(/rankpublish_app_url/);
    expect(admin).toMatch(/rankpublish_code/);
    expect(onboarding).toMatch(/\/register/);
    expect(onboarding).toMatch(/\/login/);
    expect(onboarding).toMatch(/getting-started/);
  });

  it("matches ThinkRank wizard visual language", () => {
    expect(existsSync(path.join(repoRoot, cssPath))).toBe(true);
    const css = read(cssPath);
    expect(css).toMatch(/#4451ff/);
    expect(css).toMatch(/\.rp-wizard__panel/);
    expect(css).toMatch(/border-radius:\s*22px/);
    expect(css).toMatch(/\.rp-wizard__stepper/);
    expect(css).toMatch(/\.rp-wizard__code/);
  });

  it("suppresses unrelated admin notices on the connect screen", () => {
    expect(admin).toMatch(/suppress_admin_notices|suppress_notices/);
    expect(admin).toMatch(/in_admin_header/);
    expect(admin).toMatch(/admin_body_class/);
  });
});
