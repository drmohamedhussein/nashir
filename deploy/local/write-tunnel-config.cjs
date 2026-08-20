/**
 * Write %USERPROFILE%\.ssh\rankpublish-tunnel.json from NASHIR_SSH_* env
 * (or from Cursor secrets). Run on Windows after git pull, or on Cloud Agent
 * to refresh deploy/local/cloud-tunnel.config.json (gitignored).
 *
 *   node deploy/local/write-tunnel-config.cjs
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const host = process.env.NASHIR_SSH_HOST || process.env.RANKPUBLISH_TUNNEL_HOST;
const user = process.env.NASHIR_SSH_USER || process.env.RANKPUBLISH_TUNNEL_USER;
const port = Number(process.env.RANKPUBLISH_WIN_TUNNEL_PORT || 2222);

if (!host || !user) {
  console.error("Set NASHIR_SSH_HOST and NASHIR_SSH_USER (same as Cursor Cloud secrets).");
  process.exit(1);
}

const cfg = { host, user, port };
const json = JSON.stringify(cfg, null, 2) + "\n";

const targets = [
  path.join(__dirname, "cloud-tunnel.config.json"),
  path.join(os.homedir(), ".ssh", "rankpublish-tunnel.json"),
];

for (const target of targets) {
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, json);
    console.log("Wrote", target);
  } catch (e) {
    console.warn("Skip", target, e.message);
  }
}

console.log("Tunnel target ready. Next: .\\rp-local.cmd cloud-tunnel");
