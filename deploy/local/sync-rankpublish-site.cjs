/**
 * Sync apps/rankpublish-site from monorepo → LocalWP rankpublish site.
 *
 * Usage:
 *   node deploy/local/sync-rankpublish-site.cjs
 *   node deploy/local/sync-rankpublish-site.cjs --site rankpublish-test
 */
const fs = require("fs");
const path = require("path");
const { resolveSite, DEFAULT_SITES, loadEnvrc, wp } = require("./lib/local-wp.cjs");

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

function refreshPluginRuntime(publicPath, key) {
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
    refreshPluginRuntime(publicPath, key);
  }
}

console.log("Done.");
