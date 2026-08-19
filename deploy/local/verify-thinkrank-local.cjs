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
    if (!check(`${key}: hideThinkRankUpsells present`, js.includes("hideThinkRankUpsells"))) failed++;
    if (!check(`${key}: shouldSkipHide present`, js.includes("shouldSkipHide"))) failed++;

    const host = key === "rankpublish-test" ? "rankpublish-test.local" : "rankpublish.local";
    const pages = [
      ["thinkrank", `https://${host}/wp-admin/admin.php?page=thinkrank`],
      ["schedulepress", `https://${host}/wp-admin/admin.php?page=schedulepress&rpsite_os=1&rpsite_ctx=scheduler`],
    ];
    const assetUrl = `https://${host}/wp-content/plugins/rankpublish-site/assets/branding/admin-overrides.js`;

    const asset = await request(assetUrl);
    if (!check(`${key}: branding asset HTTP`, asset.status === 200, `HTTP ${asset.status || asset.error}`)) failed++;

    for (const [label, thinkrankUrl] of pages) {
      const page = await request(thinkrankUrl);
      if (
        !check(
          `${key}: ${label} admin reachable`,
          page.status === 200 || page.status === 302,
          page.status ? `HTTP ${page.status}` : page.error
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
