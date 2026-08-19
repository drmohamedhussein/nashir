/**
 * Deploy rankpublish-site to every target this agent can reach:
 *   1. Staging (SSH) when NASHIR_SSH_* is set
 *   2. Cloud local Docker mirror (always on Linux agents)
 *   3. Windows LocalWP paths when mounted/available
 *   4. Windows via SFTP when RANKPUBLISH_WIN_SSH_* is set
 *
 * Usage:
 *   node deploy/local/deploy-all.cjs
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "../..");

function runNode(script, args = []) {
  const r = spawnSync("node", [path.join(__dirname, script), ...args], {
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

section("1/4 Staging (nashir.satest.top)");
if (process.env.NASHIR_SSH_HOST && process.env.NASHIR_SSH_USER && process.env.NASHIR_SSH_PASS) {
  results.push(["staging", runNode("../contabo/deploy-rankpublish-site.cjs")]);
} else {
  console.log("Skip — NASHIR_SSH_* not configured");
  results.push(["staging", false]);
}

section("2/4 Cloud local Docker mirror");
const dockerOk =
  spawnSync("docker", ["info"], { encoding: "utf8" }).status === 0 ||
  spawnSync("sudo", ["docker", "info"], { encoding: "utf8" }).status === 0;
if (dockerOk) {
  const boot = runNode("bootstrap-cloud-wp.cjs", ["--sync"]);
  results.push(["cloud-local", boot]);
} else {
  console.log("Skip — Docker not available");
  results.push(["cloud-local", false]);
}

section("3/4 Windows LocalWP (direct path)");
const winOk = runNode("sync-rankpublish-site.cjs");
results.push(["windows-local", winOk]);

section("4/4 Windows LocalWP (remote SFTP)");
if (process.env.RANKPUBLISH_WIN_SSH_HOST) {
  results.push(["windows-ssh", runNode("sync-via-ssh.cjs")]);
} else {
  console.log("Skip — RANKPUBLISH_WIN_SSH_HOST not set (optional remote Windows access)");
  results.push(["windows-ssh", null]);
}

console.log("\nDeploy summary:");
for (const [name, ok] of results) {
  const status = ok === null ? "skipped" : ok ? "OK" : "FAILED";
  console.log(`  ${name}: ${status}`);
}

const anyOk = results.some(([, ok]) => ok === true);
if (!anyOk) {
  process.exit(1);
}
