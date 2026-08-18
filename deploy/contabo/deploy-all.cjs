/**
 * Full staging deploy: SaaS + marketing plugin + proxy mu-plugin + schema + PayPal columns.
 *
 *   NASHIR_SSH_HOST=... NASHIR_SSH_USER=... NASHIR_SSH_PASS=... node deploy/contabo/deploy-all.cjs
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const steps = [
  ["deploy-saas.cjs", "Next.js SaaS (build + PM2 + prisma push + seed)"],
  ["migrate-paypal-columns.cjs", "Rename stripe → paypal subscription columns"],
  ["deploy-rankpublish-site.cjs", "WordPress marketing plugin (rankpublish-site)"],
  ["deploy-saas-proxy.cjs", "mu-plugin SaaS proxy (/app → :3001)"],
];

for (const [script, label] of steps) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync("node", [path.join(__dirname, script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n✗ Failed: ${script}`);
    process.exit(result.status || 1);
  }
}

console.log("\n=== Verification ===\n");
const checks = [
  "https://nashir.satest.top/api/health",
  "https://nashir.satest.top/api/v1/plans",
  "https://nashir.satest.top/register",
];
for (const url of checks) {
  const curl = spawnSync("curl", ["-sS", "-m", "15", "-o", "/dev/null", "-w", "%{http_code}", url], {
    encoding: "utf8",
  });
  const code = (curl.stdout || "").trim();
  console.log(`${code} ${url}`);
}

console.log("\n✓ deploy-all finished. Log in at https://nashir.satest.top/register then /app");
