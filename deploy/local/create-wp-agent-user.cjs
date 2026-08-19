/**
 * Create WordPress admin user for Cloud Agent on a LocalWP site.
 *
 * Usage:
 *   node deploy/local/create-wp-agent-user.cjs --site rankpublish
 *
 * Creates user: rp-cursor (login: rp-cursor)
 * Prints application password for Cursor Secrets.
 */
const fs = require("fs");
const path = require("path");
const { resolveSite, loadEnvrc, wp } = require("./lib/local-wp.cjs");

const AGENT_USER = "rp-cursor";
const AGENT_EMAIL = "rp-cursor@rankpublish.local";
const siteArg =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : "rankpublish");

const { key, publicPath } = resolveSite(siteArg);
const { env, ok } = loadEnvrc(publicPath);
if (!ok) {
  console.error("LocalWP not ready. Start site in Local first.");
  process.exit(1);
}

function randomPassword(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

console.log(`\nCreate WP agent user on ${key}\n${"=".repeat(36)}`);

let userId;
try {
  const list = wp(publicPath, ["user", "get", AGENT_USER, "--field=ID"], env, true);
  userId = list.trim();
  console.log(`User ${AGENT_USER} exists (ID ${userId})`);
} catch {
  const pass = randomPassword();
  wp(
    publicPath,
    [
      "user",
      "create",
      AGENT_USER,
      AGENT_EMAIL,
      "--role=administrator",
      `--user_pass=${pass}`,
      "--display_name=RankPublish Agent",
    ],
    env
  );
  userId = wp(publicPath, ["user", "get", AGENT_USER, "--field=ID"], env, true).trim();
  console.log(`Created user ${AGENT_USER} (ID ${userId})`);
}

// Application password (WP 5.6+)
const appPassName = "cursor-cloud-agent";
let appPass;
try {
  const existing = wp(
    publicPath,
    ["user", "application-password", "list", userId, "--format=json"],
    env,
    true
  );
  const apps = JSON.parse(existing || "[]");
  const found = apps.find((a) => a.name === appPassName);
  if (found) {
    wp(publicPath, ["user", "application-password", "delete", userId, found.uuid], env);
  }
} catch {
  /* first run */
}

const created = wp(
  publicPath,
  ["user", "application-password", "create", userId, appPassName, "--porcelain"],
  env,
  true
).trim();
appPass = created.split(/\s+/).pop();

const siteUrl = `https://${key}.local`;
const secretsFile = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".ssh",
  "CURSOR-SECRETS-rankpublish.txt"
);

const block = [
  "",
  `=== WordPress ${key} ===`,
  `RANKPUBLISH_WP_URL_${key.toUpperCase().replace(/-/g, "_")} = ${siteUrl}`,
  `RANKPUBLISH_WP_AGENT_USER = ${AGENT_USER}`,
  `RANKPUBLISH_WP_APP_PASSWORD = ${appPass}`,
  "",
].join("\n");

console.log("\nAdd to Cursor Secrets:");
console.log(block);

try {
  fs.mkdirSync(path.dirname(secretsFile), { recursive: true });
  fs.appendFileSync(secretsFile, block, "utf8");
  console.log(`Appended to ${secretsFile}`);
} catch {
  console.log("(Could not write secrets file - copy manually)");
}

console.log("\nLogin: " + siteUrl + "/wp-admin/");
console.log("  User: " + AGENT_USER);
console.log("  App password: " + appPass);
console.log("");
