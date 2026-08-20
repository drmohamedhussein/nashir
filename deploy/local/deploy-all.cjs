/**
 * Deploy rankpublish-site to every target this agent can reach.
 * Usage: node deploy/local/deploy-all.cjs
 */
const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

function runNode(script, args = []) {
  const scriptPath = script.startsWith("..") ? path.join(__dirname, script) : path.join(__dirname, script);
  const r = spawnSync("node", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  return r.status === 0;
}

function section(title) {
  console.log("\n" + "=".repeat(48));
  console.log(title);
  console.log("=".repeat(48));
}

const results = [];

section("1/5 Staging — nashir.satest.top");
if (process.env.NASHIR_SSH_HOST && process.env.NASHIR_SSH_USER && process.env.NASHIR_SSH_PASS) {
  results.push(["nashir.satest.top", runNode("../contabo/deploy-rankpublish-site.cjs")]);
} else {
  console.log("Skip — NASHIR_SSH_* not configured");
  results.push(["nashir.satest.top", false]);
}

section("2/5 Cloud local Docker — 127.0.0.1:8080");
const dockerOk =
  spawnSync("docker", ["info"], { encoding: "utf8" }).status === 0 ||
  spawnSync("sudo", ["docker", "info"], { encoding: "utf8" }).status === 0;
if (dockerOk) {
  results.push(["cloud-local", runNode("bootstrap-cloud-wp.cjs", ["--sync"])]);
} else {
  console.log("Skip — Docker not available");
  results.push(["cloud-local", false]);
}

section("3/5 Windows — rankpublish.local (SSH)");
if (process.env.RANKPUBLISH_WIN_SSH_HOST) {
  results.push(["rankpublish.local", runNode("sync-via-ssh.cjs", ["--site", "rankpublish"])]);
} else {
  console.log("Skip — RANKPUBLISH_WIN_SSH_HOST not in this agent env");
  results.push(["rankpublish.local", null]);
}

section("4/5 Windows — rankpublish-test.local (SSH)");
if (process.env.RANKPUBLISH_WIN_SSH_HOST) {
  results.push(["rankpublish-test.local", runNode("sync-via-ssh.cjs", ["--site", "rankpublish-test"])]);
} else {
  console.log("Skip — RANKPUBLISH_WIN_SSH_HOST not in this agent env");
  results.push(["rankpublish-test.local", null]);
}

section("5/5 Verify all sites");
const verified = runNode("verify-all-sites.cjs");
results.push(["verify-all", verified]);

console.log("\nDeploy summary:");
for (const [name, ok] of results) {
  const status = ok === null ? "skipped" : ok ? "OK" : "FAILED";
  console.log(`  ${name}: ${status}`);
}

const critical = results.filter(([name]) => name !== "verify-all").some(([, ok]) => ok === true);
if (!critical) process.exit(1);
