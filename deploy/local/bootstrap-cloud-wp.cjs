/**
 * Bootstrap WordPress in Docker for Cloud Agent local mirror.
 *
 * Usage:
 *   node deploy/local/bootstrap-cloud-wp.cjs
 *   node deploy/local/bootstrap-cloud-wp.cjs --sync
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dockerWp = require("./lib/docker-wp.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const composeDir = path.join(__dirname, "docker");
const composeFile = path.join(composeDir, "docker-compose.yml");
const publicPath = path.join(repoRoot, ".cloud-local-wp/public");
const stateFile = path.join(repoRoot, ".cloud-local-wp/.bootstrapped");

function dockerCmd() {
  return dockerWp.dockerPrefix();
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", stdio: "inherit", ...opts });
  if (r.error) throw r.error;
  if (r.status) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
}

function capture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function dockerCompose(args) {
  const dc = dockerCmd();
  if (!dc) throw new Error("Docker not available");
  run(dc[0], [...dc.slice(1), "compose", "-f", composeFile, ...args, "--remove-orphans"], { cwd: composeDir });
}

function wpInContainer(args) {
  dockerWp.wp(args);
}

function waitHttp(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    const r = capture("curl", ["-sf", url]);
    if (r.status === 0 && !(r.stdout || "").includes("Error establishing a database connection")) {
      return;
    }
    spawnSync("sleep", ["2"]);
  }
  throw new Error("WordPress HTTP not ready: " + url);
}

const doSync = process.argv.includes("--sync");

console.log("\nBootstrap Cloud Local WP\n" + "=".repeat(36));

if (!dockerCmd()) {
  console.error("Docker not available on this agent.");
  process.exit(1);
}

fs.mkdirSync(path.join(publicPath, "wp-content/plugins"), { recursive: true });
dockerWp.ensureHostWpPhar();

dockerCompose(["up", "-d"]);
dockerWp.waitForDb();
waitHttp("http://127.0.0.1:8080/");

const installed = dockerWp.wp(["core", "is-installed"], { allowFail: true }).stdout;

if (installed !== "1") {
  console.log("\nFirst boot — installing WordPress...");
  wpInContainer([
    "core",
    "install",
    "--url=http://127.0.0.1:8080",
    "--title=RankPublish Cloud Local",
    "--admin_user=admin",
    "--admin_password=admin",
    "--admin_email=admin@rankpublish.local",
    "--skip-email",
  ]);
  fs.writeFileSync(stateFile, new Date().toISOString());
}

if (doSync) {
  try {
    spawnSync("sudo", ["chown", "-R", `${process.env.USER || "ubuntu"}:www-data`, publicPath], { stdio: "inherit" });
    spawnSync("sudo", ["chmod", "-R", "g+w", path.join(publicPath, "wp-content")], { stdio: "inherit" });
  } catch {
    /* best effort */
  }
  run("node", [path.join(__dirname, "sync-rankpublish-site.cjs"), "--site", "cloud-local"], { cwd: repoRoot });
} else {
  try {
    wpInContainer(["plugin", "activate", "rankpublish-site"]);
  } catch {
    /* sync will activate */
  }
}

console.log("\nCloud local WP ready:");
console.log("  URL:    http://127.0.0.1:8080/wp-admin/");
console.log("  Path:   " + publicPath);
console.log("  Login:  admin / admin");
console.log("");
