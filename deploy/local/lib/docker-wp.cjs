const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "../../..");
const composeFile = path.join(__dirname, "../docker/docker-compose.yml");
const composeDir = path.join(__dirname, "../docker");
const hostWpPhar = path.join(repoRoot, ".cloud-local-wp/bin/wp-cli.phar");

function capture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function dockerPrefix() {
  if (capture("docker", ["info"], { stdio: "ignore" }).status === 0) {
    return ["docker"];
  }
  if (capture("sudo", ["docker", "info"], { stdio: "ignore" }).status === 0) {
    return ["sudo", "docker"];
  }
  return null;
}

function containerName() {
  const r = capture("docker", ["compose", "-f", composeFile, "ps", "-q", "wordpress"], { cwd: composeDir });
  const id = (r.stdout || "").trim();
  if (!id) return "docker-wordpress-1";
  const name = capture("docker", ["inspect", "-f", "{{.Name}}", id]);
  return (name.stdout || "docker-wordpress-1").trim().replace(/^\//, "");
}

function ensureHostWpPhar() {
  if (fs.existsSync(hostWpPhar)) return;
  fs.mkdirSync(path.dirname(hostWpPhar), { recursive: true });
  const r = spawnSync(
    "curl",
    ["-fsSL", "-o", hostWpPhar, "https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar"],
    { encoding: "utf8", stdio: "pipe" }
  );
  if (r.status) {
    throw new Error(r.stderr || r.stdout || "Failed to download wp-cli.phar on host");
  }
  fs.chmodSync(hostWpPhar, 0o755);
}

function ensureWpCli() {
  const dc = dockerPrefix();
  if (!dc) throw new Error("Docker not available");

  const check = capture(
    dc[0],
    [...dc.slice(1), "compose", "-f", composeFile, "exec", "-T", "wordpress", "bash", "-lc", "test -x /usr/local/bin/wp && echo ok"],
    { cwd: composeDir }
  );
  if ((check.stdout || "").includes("ok")) return;

  ensureHostWpPhar();
  const name = containerName();
  const cp = capture(dc[0], [...dc.slice(1), "cp", hostWpPhar, `${name}:/usr/local/bin/wp`]);
  if (cp.status) {
    throw new Error(cp.stderr || cp.stdout || "docker cp wp-cli failed");
  }
  const chmod = capture(
    dc[0],
    [...dc.slice(1), "compose", "-f", composeFile, "exec", "-T", "wordpress", "chmod", "+x", "/usr/local/bin/wp"],
    { cwd: composeDir }
  );
  if (chmod.status) {
    throw new Error(chmod.stderr || chmod.stdout || "chmod wp failed");
  }
}

function wp(args, opts = {}) {
  const dc = dockerPrefix();
  if (!dc) throw new Error("Docker not available");
  ensureWpCli();
  const wpArgs = [...args];
  if (!wpArgs.some((a) => a.startsWith("--url="))) {
    wpArgs.push("--url=http://127.0.0.1:8080");
  }
  const r = spawnSync(
    dc[0],
    [
      ...dc.slice(1),
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "wordpress",
      "wp",
      ...wpArgs,
      "--allow-root",
    ],
    { encoding: "utf8", cwd: composeDir, stdio: "pipe" }
  );
  if (opts.allowFail) {
    return {
      status: r.status,
      stdout: (r.stdout || "").trim(),
      stderr: (r.stderr || "").trim(),
    };
  }
  if (r.status) throw new Error(r.stderr || r.stdout || "wp failed");
  return (r.stdout || "").trim();
}

function waitForDb(attempts = 30) {
  const dc = dockerPrefix();
  if (!dc) throw new Error("Docker not available");
  for (let i = 0; i < attempts; i++) {
    const r = capture(
      dc[0],
      [
        ...dc.slice(1),
        "compose",
        "-f",
        composeFile,
        "exec",
        "-T",
        "wordpress",
        "php",
        "-r",
        "mysqli_report(MYSQLI_REPORT_OFF); exit(@mysqli_connect('host.docker.internal','wordpress','wordpress','wordpress',3307)?0:1);",
      ],
      { cwd: composeDir }
    );
    if (r.status === 0) return;
    spawnSync("sleep", ["2"]);
  }
  throw new Error("WordPress container cannot reach MySQL on host.docker.internal:3307");
}

module.exports = {
  dockerPrefix,
  wp,
  composeFile,
  composeDir,
  ensureWpCli,
  ensureHostWpPhar,
  waitForDb,
  hostWpPhar,
};
