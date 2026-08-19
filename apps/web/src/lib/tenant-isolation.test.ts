import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("workspace post isolation", () => {
  it("calendar, SEO, and post actions stay scoped to the session workspace", () => {
    const calendar = read("apps/web/src/app/app/calendar/page.tsx");
    const seo = read("apps/web/src/app/app/seo/page.tsx");
    const action = read("apps/web/src/app/api/v1/posts/[postId]/action/route.ts");
    const posts = read("apps/web/src/app/api/v1/sites/[siteId]/posts/route.ts");

    expect(calendar).toMatch(/workspaceId:\s*session\.workspaceId/);
    expect(calendar).toMatch(/site:\s*\{\s*workspaceId:\s*session\.workspaceId\s*\}/);
    expect(seo).toMatch(/workspaceId:\s*session\.workspaceId/);
    expect(seo).toMatch(/site:\s*\{\s*workspaceId:\s*session\.workspaceId\s*\}/);
    expect(action).toMatch(/site:\s*\{\s*workspaceId:\s*session\.workspaceId\s*\}/);
    expect(posts).toMatch(/workspaceId:\s*session\.workspaceId/);
  });

  it("cloud app routes never query WordPress HQ via get_posts or home_url", () => {
    const calendar = read("apps/web/src/app/app/calendar/page.tsx");
    const seo = read("apps/web/src/app/app/seo/page.tsx");
    expect(calendar).not.toMatch(/get_posts\s*\(/);
    expect(seo).not.toMatch(/get_posts\s*\(/);
    expect(calendar).not.toMatch(/home_url\s*\(/);
    expect(seo).not.toMatch(/home_url\s*\(/);
  });
});

describe("reject HQ origin as a customer Site", () => {
  it("connect and license refuse HQ before upsert", () => {
    const connect = read("apps/web/src/app/api/v1/connect/route.ts");
    const license = read("apps/web/src/lib/license.ts");
    const upsertConnect = connect.indexOf("prisma.site.upsert");
    const upsertLicense = license.indexOf("prisma.site.upsert");
    const rejectConnect = connect.search(/customerSiteUrlOrError|isHqOrigin|HQ_SITE_BLOCKED/);
    const rejectLicense = license.search(/customerSiteUrlOrError|isHqOrigin|HQ_SITE_BLOCKED/);

    expect(rejectConnect).toBeGreaterThan(-1);
    expect(upsertConnect).toBeGreaterThan(rejectConnect);
    expect(rejectLicense).toBeGreaterThan(-1);
    expect(upsertLicense).toBeGreaterThan(rejectLicense);
  });

  it("signed WordPress calls refuse HQ rest URLs", () => {
    const wordpress = read("apps/web/src/lib/wordpress.ts");
    const scheduler = read("apps/web/src/lib/scheduler.ts");
    expect(wordpress).toMatch(/isHqOrigin/);
    expect(wordpress.indexOf("isHqOrigin")).toBeLessThan(wordpress.indexOf("fetch("));
    expect(scheduler).toMatch(/isHqOrigin/);
  });
});

describe("Continue in RankPublish reads siteUrl", () => {
  it("getting-started honors siteUrl and siteName from the HQ Continue link", () => {
    const page = read("apps/web/src/app/app/getting-started/page.tsx");
    expect(page).toMatch(/searchParams/);
    expect(page).toMatch(/siteUrl/);
    expect(page).toMatch(/siteName/);
    expect(page).toMatch(/readIntendedSite/);
  });

  it("login keeps the getting-started query on next", () => {
    const middleware = read("apps/web/src/middleware.ts");
    const auth = read("apps/web/src/components/auth-form.tsx");
    expect(middleware).toMatch(/pathname\s*\+\s*request\.nextUrl\.search/);
    expect(auth).toMatch(/safeAppNextPath/);
  });
});

describe("HQ operator shell is not a customer clone", () => {
  it("hides Connected sites / Scheduler / SEO from default HQ nav", () => {
    const os = read("apps/rankpublish-site/includes/class-admin-os.php");
    const admin = read("apps/rankpublish-site/includes/class-admin.php");
    expect(os).toMatch(/is_dev_mode\(\)/);
    expect(os).toMatch(/This HQ WordPress — not a customer seat/);
    expect(os).toMatch(/\/app\/getting-started/);
    const navFn = os.slice(os.indexOf("function nav("), os.indexOf("function url("));
    expect(navFn).toMatch(/is_dev_mode/);
    expect(admin).toMatch(/remove_submenu_page\(\s*self::MENU_SLUG,\s*self::MENU_SLUG\s*\.\s*'-sites'/);
  });

  it("gates OS engine wrap redirect behind dev mode and banners HQ content", () => {
    const embed = read("apps/rankpublish-site/includes/class-module-embed.php");
    expect(embed).toMatch(/is_dev_mode\(\)/);
    expect(embed).toMatch(/hq_banner/);
    const redirect = embed.slice(
      embed.indexOf("function maybe_redirect_core_module"),
      embed.indexOf("function register_native_wrap"),
    );
    expect(redirect).toMatch(/is_dev_mode\(\)/);
  });
});

describe("cloud pairing and engine chrome", () => {
  it("hides the Sites wizard when a site already exists", () => {
    const home = read("apps/web/src/app/app/page.tsx");
    expect(home).toMatch(/ConnectionWizard/);
    expect(home).toMatch(/sites\.length === 0 \? <ConnectionWizard/);
  });

  it("calendar and SEO deep-link only to the customer WordPress admin", () => {
    const engine = read("apps/web/src/components/rankpublish/engine-workspace.tsx");
    expect(engine).toMatch(/site\.url/);
    expect(engine).toMatch(/rp_os=1/);
    expect(engine).not.toMatch(/rpsite_os/);
    expect(engine).not.toMatch(/nashir\.satest\.top/);
    expect(engine).toMatch(/isHqOrigin/);
    expect(engine).toMatch(/sites\.length > 1/);
  });

  it("surfaces sync errors even when posts already exist", () => {
    const calendar = read("apps/web/src/app/app/calendar/page.tsx");
    const seo = read("apps/web/src/app/app/seo/page.tsx");
    expect(calendar).toMatch(/syncErrors\.length/);
    expect(seo).toMatch(/syncErrors\.length/);
    expect(calendar).not.toMatch(/mapped\.length === 0 && syncErrors/);
    expect(seo).not.toMatch(/items\.length === 0 && syncErrors/);
  });
});

describe("customer plugin engine shell", () => {
  it("wraps SchedulePress/ThinkRank on the customer site, not HQ", () => {
    const shell = read("apps/rankpublish/includes/connector/class-engine-shell.php");
    const boot = read("apps/rankpublish/includes/connector/class-connector.php");
    const hubs = read("apps/rankpublish/includes/connector/class-workspace-admin.php");
    expect(boot).toMatch(/class-engine-shell\.php/);
    expect(boot).toMatch(/Engine_Shell/);
    expect(shell).toMatch(/rp_os/);
    expect(shell).not.toMatch(/rpsite_os/);
    expect(shell).toMatch(/home_url\(/);
    expect(shell).toMatch(/not RankPublish HQ/);
    expect(hubs).toMatch(/rp_os/);
  });
});

describe("pairing origin contract", () => {
  it("stores the customer plugin site_url, never nashir.satest.top as a default", () => {
    const connect = read("apps/web/src/app/api/v1/connect/route.ts");
    expect(connect).toMatch(/parsed\.data\.site_url/);
    expect(connect).not.toMatch(/home_url\s*\(/);
    expect(connect).not.toMatch(/nashir\.satest\.top/);
    expect(connect).toMatch(/customerSiteUrlOrError/);
  });

  it("keeps the HQ deploy gate that deactivates the customer plugin", () => {
    const deploy = read("deploy/contabo/deploy-rankpublish-site.cjs");
    expect(deploy).toMatch(/plugin deactivate rankpublish/);
    expect(deploy).toMatch(/plugin activate rankpublish-site/);
  });
});
