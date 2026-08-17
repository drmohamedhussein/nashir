/**
 * Switch a LocalWP site between dev stack and RankPublish product-only mode.
 *
 * Usage:
 *   node deploy/local/switch-product-mode.cjs dev
 *   node deploy/local/switch-product-mode.cjs product
 *   node deploy/local/switch-product-mode.cjs status
 *   node deploy/local/switch-product-mode.cjs product --site rankpublish-test --sync
 *
 * Env:
 *   RANKPUBLISH_LOCAL_SITE — rankpublish | rankpublish-test (default: rankpublish)
 *   RANKPUBLISH_PUBLIC     — override wp root path
 */
const {
  DEV_ACTIVE,
  PRODUCT_ACTIVE,
  ALWAYS_OFF,
  loadEnvrc,
  wp,
  pluginInstalled,
  resolveSite,
  syncRankpublish,
  detectMode,
  DEFAULT_SITES,
} = require("./lib/local-wp.cjs");

const mode = (process.argv[2] || "status").toLowerCase();
const siteArg = process.argv.find((a, i) => process.argv[i - 1] === "--site");
const sync = process.argv.includes("--sync");

if (!["dev", "product", "status"].includes(mode)) {
  console.error("Usage: node switch-product-mode.cjs <dev|product|status> [--site rankpublish|rankpublish-test] [--sync]");
  process.exit(1);
}

const { key, publicPath } = resolveSite(siteArg);
const { env, envrcPath, ok } = loadEnvrc(publicPath);

if (!ok) {
  console.error(`Missing PHPRC for ${key}. Start the site in Local once (creates ${envrcPath}).`);
  process.exit(1);
}

function deactivate(slugs) {
  for (const slug of slugs) {
    if (!pluginInstalled(publicPath, slug, env)) continue;
    try {
      wp(publicPath, ["plugin", "deactivate", slug], env);
    } catch {
      wp(publicPath, ["plugin", "deactivate", slug, "--skip-plugins"], env);
    }
  }
}

function activate(slugs) {
  const present = slugs.filter((slug) => pluginInstalled(publicPath, slug, env));
  const missing = slugs.filter((slug) => !pluginInstalled(publicPath, slug, env));
  if (missing.length) {
    console.warn("Not installed (skipped):", missing.join(", "));
  }
  if (!present.length) return;
  wp(publicPath, ["plugin", "activate", ...present], env);
}

if (mode === "status") {
  const current = detectMode(publicPath, env);
  console.log(`Site: ${key}`);
  console.log(`Path: ${publicPath}`);
  console.log(`Mode: ${current}`);
  wp(publicPath, ["plugin", "list", "--fields=name,status,version"], env);
  process.exit(0);
}

if (mode === "product") {
  const sourcePublic = DEFAULT_SITES.rankpublish;
  if (sync || key === "rankpublish-test" || !pluginInstalled(publicPath, "rankpublish", env)) {
    console.log("Syncing rankpublish plugin from rankpublish site…");
    syncRankpublish(sourcePublic, publicPath);
  }

  console.log(`Switching ${key} → product mode (rankpublish only)…`);
  deactivate(ALWAYS_OFF.product);
  activate(PRODUCT_ACTIVE);
} else {
  console.log(`Switching ${key} → dev stack (upstream + site core)…`);
  deactivate(ALWAYS_OFF.dev);
  activate(DEV_ACTIVE);
}

try {
  wp(publicPath, ["cache", "flush"], env);
} catch {
  /* optional */
}

const after = detectMode(publicPath, env);
console.log(`\nMode now: ${after}`);
wp(publicPath, ["plugin", "list", "--fields=name,status,version"], env);

const urls = {
  rankpublish: "http://rankpublish.local/wp-admin/",
  "rankpublish-test": "http://rankpublish-test.local/wp-admin/",
};
console.log(`\nAdmin: ${urls[key] || publicPath}`);
