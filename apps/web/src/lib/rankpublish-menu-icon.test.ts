import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("RankPublish admin menu mark", () => {
  const menuSvg = "apps/rankpublish/assets/logo-menu.svg";
  const markSvg = "apps/rankpublish/assets/logo.svg";
  const menuCss = "apps/rankpublish/assets/admin-menu.css";
  const branding = read("apps/rankpublish-site/includes/class-branding.php");
  const admin = read("apps/rankpublish/includes/connector/class-admin.php");

  it("ships a 20x20 RP + ranking-bars menu icon", () => {
    expect(existsSync(path.join(repoRoot, menuSvg))).toBe(true);
    const svg = read(menuSvg);
    expect(svg).toMatch(/width="20"/);
    expect(svg).toMatch(/height="20"/);
    expect(svg).toMatch(/viewBox="0 0 20 20"/);
    expect(svg).toMatch(/aria-label="RankPublish"/);
    expect(svg).toMatch(/#4451[Ff]{2}/);
  });

  it("ships a square RP mark for chrome and the wizard", () => {
    expect(existsSync(path.join(repoRoot, markSvg))).toBe(true);
    const svg = read(markSvg);
    expect(svg).toMatch(/width="32"/);
    expect(svg).toMatch(/height="32"/);
  });

  it("forces WordPress menu images to dashicon size on every admin screen", () => {
    expect(existsSync(path.join(repoRoot, menuCss))).toBe(true);
    const css = read(menuCss);
    expect(css).toMatch(/background-size:\s*20px\s+20px/);
    expect(css).toMatch(/toplevel_page_rankpublish/);
    expect(css).toMatch(/toplevel_page_thinkrank/);
    expect(css).toMatch(/toplevel_page_schedulepress/);
    expect(css).toMatch(/display:\s*none\s*!important/);
    expect(admin).toMatch(/admin-menu\.css/);
    expect(branding).toMatch(/display:\s*none\s*!important/);
    expect(branding).toMatch(/background-size:\s*20px 20px/);
    expect(branding).toMatch(/logo-menu\.svg/);
    expect(read("apps/rankpublish-site/assets/branding/logo-menu.svg")).toMatch(/width="20"/);
    expect(read("apps/rankpublish-site/assets/branding/logo-icon.svg")).toMatch(/width="32"/);
  });
});
