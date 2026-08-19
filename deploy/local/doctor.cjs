/**
 * Diagnose LocalWP PHP + WP-CLI paths for deploy/local scripts.
 *
 * Usage:
 *   node deploy/local/doctor.cjs --site rankpublish
 */
const fs = require("fs");
const {
  loadEnvrc,
  resolveSite,
  resolvePhpExe,
  WP_PHAR,
} = require("./lib/local-wp.cjs");

const siteArg = process.argv.find((a, i) => process.argv[i - 1] === "--site");
const { key, publicPath } = resolveSite(siteArg || "rankpublish");
const { envrcPath, ok, phpExe, env } = loadEnvrc(publicPath);

console.log(`\nLocalWP doctor — ${key}\n${"=".repeat(40)}`);
console.log("publicPath:", publicPath);
console.log("envrcPath:", envrcPath, fs.existsSync(envrcPath) ? "(found)" : "(missing)");
console.log("PHPRC:", env.PHPRC || "(unset)");
console.log("phpExe:", phpExe || "(not found)");
console.log("WP_PHAR:", WP_PHAR, fs.existsSync(WP_PHAR) ? "(found)" : "(missing)");
console.log("ready:", ok && phpExe && fs.existsSync(WP_PHAR) ? "yes" : "no");

if (!ok || !phpExe || !fs.existsSync(WP_PHAR)) {
  console.log("\nFix:");
  console.log("1. Open Local → start site → wait until Running");
  console.log("2. Re-run: node deploy/local/doctor.cjs --site " + key);
  process.exit(1);
}
