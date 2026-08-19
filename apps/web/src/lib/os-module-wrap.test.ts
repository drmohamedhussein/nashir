import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("RankPublish OS native module wrap", () => {
  const embed = read("apps/rankpublish-site/includes/class-module-embed.php");
  const brandingJs = read("apps/rankpublish-site/assets/branding/admin-overrides.js");
  const adminCss = read("apps/rankpublish-site/assets/admin.css");

  it("attaches the output buffer after WordPress sets page_hook", () => {
    expect(embed).toMatch(/add_action\(\s*'current_screen'/);
    expect(embed).toMatch(/\$GLOBALS\['hook_suffix'\]/);
    expect(embed).not.toMatch(/add_action\(\s*'load-'\s*\.\s*\$page/);
  });

  it("does not busy-loop branding over the React tree", () => {
    expect(brandingJs).not.toMatch(/burst\s*<\s*40/);
    expect(brandingJs).toMatch(/applying/);
    expect(brandingJs).toMatch(/disconnect\(/);
  });

  it("gives ThinkRank and SchedulePress roots a usable height", () => {
    expect(adminCss).toMatch(/\.rpsite-module-native \.tr-root[\s\S]{0,220}height:\s*100%\s*!important/);
    expect(adminCss).not.toMatch(/\.rpsite-module-native \.tr-root \{[\s\S]{0,120}height:\s*auto\s*!important/);
  });

  it("keeps billing entitlement copy next to the check icon", () => {
    const ents = adminCss.match(/\.rpsite-os-ents li \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(ents).toMatch(/justify-content:\s*flex-start/);
    expect(ents).not.toMatch(/space-between/);
    expect(adminCss).toMatch(/\.rpsite-os-ents li > div \{[\s\S]*?min-width:\s*12rem/);
  });
});

describe("RankPublish OS connect modal", () => {
  const os = read("apps/rankpublish-site/includes/class-admin-os.php");
  const adminJs = read("apps/rankpublish-site/assets/admin.js");
  const adminCss = read("apps/rankpublish-site/assets/admin.css");
  const adminPhp = read("apps/rankpublish-site/includes/class-admin.php");
  const embed = read("apps/rankpublish-site/includes/class-module-embed.php");
  const urlBlock = os.match(/WordPress URL[\s\S]{0,500}/)?.[0] ?? "";

  it("lets the operator type a customer WordPress URL", () => {
    expect(urlBlock).toMatch(/data-rpsite-wp-url/);
    expect(urlBlock).not.toMatch(/readonly/);
    expect(urlBlock).toMatch(/placeholder=/);
  });

  it("exposes a header close control so the menu is reachable again", () => {
    expect(os).toMatch(/rpsite-os-modal__close/);
    expect(os).toMatch(/data-rpsite-close="connect"/);
  });

  it("sends the typed URL to RankPublish Cloud and rejects this HQ host", () => {
    expect(os).toMatch(/data-rpsite-continue-cloud/);
    expect(adminJs).toMatch(/data-rpsite-continue-cloud/);
    expect(adminJs).toMatch(/hqHost/);
    expect(adminPhp).toMatch(/hqUrlBlocked/);
    expect(embed).toMatch(/localize_admin_script/);
  });

  it("keeps [hidden] stronger than the open modal display and slides RTL nav from the end", () => {
    const displayAt = adminCss.indexOf(".rpsite-os-modal {");
    const hiddenAt = adminCss.lastIndexOf(".rpsite-os-modal[hidden]");
    expect(displayAt).toBeGreaterThan(-1);
    expect(hiddenAt).toBeGreaterThan(displayAt);
    expect(adminCss).toMatch(/\[dir="rtl"\][\s\S]{0,120}\.rpsite-os-sidebar/);
  });
});
