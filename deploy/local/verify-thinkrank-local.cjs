/**
 * Lightweight local verification (no WP-CLI / PHP required).
 *
 * Usage:
 *   node deploy/local/verify-thinkrank-local.cjs
 *   node deploy/local/verify-thinkrank-local.cjs --site rankpublish-test
 */
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { resolveSite, DEFAULT_SITES } = require("./lib/local-wp.cjs");

const siteArg = process.argv.find((a, i) => process.argv[i - 1] === "--site");
const sites = siteArg ? [resolveSite(siteArg)] : Object.keys(DEFAULT_SITES).map((key) => resolveSite(key));

function request(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 15000, rejectUnauthorized: false }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () =>
        resolve({
          status: res.statusCode || 0,
          body,
        })
      );
    });
    req.on("error", (error) => resolve({ status: 0, body: "", error: error.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", error: "timeout" });
    });
  });
}

async function requestWithFallback(host, path) {
  const httpsUrl = `https://${host}${path}`;
  const httpsRes = await request(httpsUrl);
  if (httpsRes.status === 200 || httpsRes.status === 302) {
    return { ...httpsRes, url: httpsUrl };
  }
  if (httpsRes.error === "timeout" || httpsRes.status === 0) {
    const httpUrl = `http://${host}${path}`;
    const httpRes = await request(httpUrl);
    return { ...httpRes, url: httpUrl };
  }
  return { ...httpsRes, url: httpsUrl };
}

function check(label, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

(async () => {
  let failed = 0;
  console.log(`\nThinkRank local verify\n${"=".repeat(40)}\n`);

  for (const { key, publicPath } of sites) {
    if (!fs.existsSync(publicPath)) {
      if (!check(`${key}: site folder exists`, false, publicPath)) failed++;
      continue;
    }

    const pluginRoot = path.join(publicPath, "wp-content/plugins/rankpublish-site");
    const jsPath = path.join(pluginRoot, "assets/branding/admin-overrides.js");
    const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, "utf8") : "";

    if (!check(`${key}: rankpublish-site synced`, fs.existsSync(pluginRoot), pluginRoot)) failed++;
    const version = (fs.existsSync(path.join(pluginRoot, "rankpublish-site.php"))
      ? fs.readFileSync(path.join(pluginRoot, "rankpublish-site.php"), "utf8")
      : ""
    ).match(/define\(\s*'RPSITE_VERSION',\s*'([^']+)'/);
    if (!check(`${key}: plugin version`, version && version[1], version ? version[1] : "unknown")) failed++;
    if (!check(`${key}: hideModuleUpsells present`, js.includes("hideModuleUpsells"))) failed++;
    if (!check(`${key}: shouldSkipHide present`, js.includes("shouldSkipHide"))) failed++;
    if (!check(`${key}: unlockModuleScroll present`, js.includes("unlockModuleScroll"))) failed++;
    if (!check(`${key}: unlockScrollOnElement present`, js.includes("unlockScrollOnElement"))) failed++;

    const cssPath = path.join(pluginRoot, "assets/branding/admin-overrides.css");
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
    if (!check(`${key}: scroll unlock CSS present`, css.includes("document-level scroll"))) failed++;

    const embedPhp = path.join(pluginRoot, "includes/class-module-embed.php");
    const embed = fs.existsSync(embedPhp) ? fs.readFileSync(embedPhp, "utf8") : "";
    if (!check(`${key}: PHP scroll bootstrap present`, embed.includes("admin_load_hook") || embed.includes("toplevel_page_"))) failed++;

    const host = key === "rankpublish-test" ? "rankpublish-test.local" : "rankpublish.local";
    const pages = [
      ["thinkrank", "/wp-admin/admin.php?page=thinkrank"],
      ["schedulepress", "/wp-admin/admin.php?page=schedulepress&rpsite_os=1&rpsite_ctx=scheduler"],
    ];

    const asset = await requestWithFallback(
      host,
      "/wp-content/plugins/rankpublish-site/assets/branding/admin-overrides.js"
    );
    if (!check(`${key}: branding asset HTTP`, asset.status === 200, `${asset.url} -> HTTP ${asset.status || asset.error}`)) failed++;
    if (
      !check(
        `${key}: branding asset unlockScrollOnElement`,
        asset.body.includes("unlockScrollOnElement"),
        asset.url
      )
    ) {
      failed++;
    }

    for (const [label, adminPath] of pages) {
      const page = await requestWithFallback(host, adminPath);
      if (
        !check(
          `${key}: ${label} admin reachable`,
          page.status === 200 || page.status === 302,
          `${page.url} -> ${page.status ? `HTTP ${page.status}` : page.error}`
        )
      ) {
        failed++;
      }
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  if (failed) {
    console.log(`Result: ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("Result: all checks passed");
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
