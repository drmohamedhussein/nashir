/**
 * Helpers for Cloud Agent → Windows LocalWP SSH reachability.
 * Private LAN IPs are never reachable from Cursor Cloud Agents.
 */
const net = require("net");
const { spawnSync } = require("child_process");

function isPrivateOrLocalHost(host) {
  if (!host) return true;
  const h = String(host).trim().toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  // IPv4 private / link-local
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false; // hostname — assume possibly public (Tailscale/DNS)
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function tcpProbe(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: timeoutMs }, () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.on("error", (e) => resolve({ ok: false, error: e.message }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

function privateHostGuidance(host) {
  return [
    `RANKPUBLISH_WIN_SSH_HOST=${host} is a private/LAN address.`,
    "Cursor Cloud Agents cannot reach your Windows LAN without a public path.",
    "",
    "Fix (pick one):",
    "  A) Set RANKPUBLISH_WIN_SSH_HOST to your public IP and forward TCP 22 → this PC,",
    "     then ensure OpenSSH Server is running (rp-local.cmd setup-ssh).",
    "  B) Use Tailscale/ZeroTier and set HOST to that reachable IP/hostname.",
    "  C) Sync locally on Windows (no cloud SSH needed):",
    "       .\\rp-local.cmd sync --site rankpublish",
    "       .\\rp-local.cmd sync --site rankpublish-test",
    "     or: node deploy/local/sync-rankpublish-site.cjs --site rankpublish-test",
  ].join("\n");
}

function diagnoseWinHost(host, port = 22) {
  if (!host) {
    return {
      reachable: false,
      private: true,
      note: "RANKPUBLISH_WIN_SSH_HOST not set",
      guidance: "Add RANKPUBLISH_WIN_SSH_HOST in Cursor Cloud Agent secrets.",
    };
  }
  if (isPrivateOrLocalHost(host)) {
    return {
      reachable: false,
      private: true,
      note: "private/LAN IP — unreachable from Cloud Agent",
      guidance: privateHostGuidance(host),
    };
  }
  const probe = spawnSync(
    "node",
    [
      "-e",
      `const net=require('net');const s=net.connect({host:${JSON.stringify(host)},port:${Number(port)},timeout:5000},()=>{console.log('open');s.destroy();process.exit(0)});s.on('error',e=>{console.log(e.message);process.exit(1)});s.on('timeout',()=>{console.log('timeout');process.exit(1)});`,
    ],
    { encoding: "utf8", timeout: 8000 }
  );
  const out = ((probe.stdout || "") + (probe.stderr || "")).trim();
  if (probe.status === 0) {
    return { reachable: true, private: false, note: `tcp ${port} open`, guidance: null };
  }
  return {
    reachable: false,
    private: false,
    note: `tcp ${port} failed: ${out || "unknown"}`,
    guidance: [
      `Host ${host} looks public but TCP ${port} is not reachable.`,
      "Check: PC online, OpenSSH Server running, firewall allows 22, router port-forward.",
      "Or sync locally: .\\rp-local.cmd sync --site rankpublish",
    ].join("\n"),
  };
}

module.exports = {
  isPrivateOrLocalHost,
  tcpProbe,
  privateHostGuidance,
  diagnoseWinHost,
};
