/**
 * Sync apps/rankpublish-site from monorepo → LocalWP rankpublish site.
 *
 * Usage:
 *   node deploy/local/sync-rankpublish-site.cjs
 *   node deploy/local/sync-rankpublish-site.cjs --site rankpublish-test
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveSite, DEFAULT_SITES, loadEnvrc, wp } = require("./lib/local-wp.cjs");
const dockerWp = require("./lib/docker-wp.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "apps/rankpublish-site");
const siteArg =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : null);

if (!fs.existsSync(path.join(source, "rankpublish-site.php"))) {
  console.error("Missing source:", source);
  process.exit(1);
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true, filter: (p) => !p.includes("node_modules") });
}

function parseVersion(version) {
  const parts = String(version).split(".").map((n) => parseInt(n, 10) || 0);
  return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

function verifySyncedPlugin(dest, key) {
  const mainPhp = path.join(dest, "rankpublish-site.php");
  const jsPath = path.join(dest, "assets/branding/admin-overrides.js");
  const cssPaths = [
    path.join(dest, "assets/branding/admin-overrides.css"),
    path.join(dest, "assets/admin.css"),
  ];
  const php = fs.existsSync(mainPhp) ? fs.readFileSync(mainPhp, "utf8") : "";
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, "utf8") : "";
  const css = cssPaths.filter((p) => fs.existsSync(p)).map((p) => fs.readFileSync(p, "utf8")).join("\n");
  const version = (php.match(/define\(\s*'RPSITE_VERSION',\s*'([^']+)'/) || [])[1] || "?";

  const markers = [
    ["unlockModuleScroll", js.includes("unlockModuleScroll")],
    ["unlockScrollOnElement", js.includes("unlockScrollOnElement")],
    ["hideModuleUpsells", js.includes("hideModuleUpsells")],
    ["normalizeModuleLayout", js.includes("normalizeModuleLayout")],
    ["layout: transparent module wrap", css.includes("background: transparent") && css.includes("rpsite-module-native .tr-root")],
    ["scroll unlock CSS", css.includes("document-level scroll")],
    ["version >= 1.8.6", version !== "?" && parseVersion(version) >= parseVersion("1.8.6")],
    ["version >= 1.9.0", version !== "?" && parseVersion(version) >= parseVersion("1.9.0")],
  ];

  console.log(`\nVerify synced plugin on ${key} (v${version}):`);
  let failed = 0;
  for (const [label, pass] of markers) {
    console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
    if (!pass) failed++;
  }
  if (failed) {
    throw new Error(`Sync verification failed on ${key}: ${failed} marker(s) missing`);
  }
}

function refreshPluginRuntime(publicPath, key) {
  if (key === "cloud-local") {
    try {
      dockerWp.wp(["plugin", "deactivate", "rankpublish-site"]);
      dockerWp.wp(["plugin", "activate", "rankpublish-site"]);
      try {
        dockerWp.wp(["cache", "flush"]);
      } catch {
        /* optional */
      }
      console.log(`Refreshed rankpublish-site runtime on ${key} (docker)`);
    } catch (error) {
      console.warn(`Runtime refresh skipped on ${key}: ${error.message || error}`);
    }
    return;
  }
  try {
    const { env, ok } = loadEnvrc(publicPath);
    if (!ok) {
      console.warn(`Skip runtime refresh for ${key}: LocalWP env not ready`);
      return;
    }
    wp(publicPath, ["plugin", "deactivate", "rankpublish-site"], env);
    wp(publicPath, ["plugin", "activate", "rankpublish-site"], env);
    try {
      wp(publicPath, ["cache", "flush"], env);
    } catch {
      /* optional */
    }
    console.log(`Refreshed rankpublish-site runtime on ${key}`);
  } catch (error) {
    console.warn(`Runtime refresh skipped on ${key}: ${error.message || error}`);
  }
}

if (siteArg) {
  const { publicPath, key } = resolveSite(siteArg);
  if (!fs.existsSync(publicPath)) {
    console.error("Site not found:", key);
    process.exit(1);
  }
  const dest = path.join(publicPath, "wp-content/plugins/rankpublish-site");
  console.log("Sync rankpublish-site →", dest);
  copyDir(source, dest);
  verifySyncedPlugin(dest, key);
  refreshPluginRuntime(publicPath, key);
} else {
  for (const [key, publicPath] of Object.entries(DEFAULT_SITES)) {
    if (!fs.existsSync(publicPath)) {
      console.warn("Skip missing site:", key);
      continue;
    }
    const dest = path.join(publicPath, "wp-content/plugins/rankpublish-site");
    console.log("Sync rankpublish-site →", dest);
    copyDir(source, dest);
    verifySyncedPlugin(dest, key);
    refreshPluginRuntime(publicPath, key);
  }
}

console.log("Done.");
