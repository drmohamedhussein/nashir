/**
 * Verify rankpublish-site version on all reachable targets.
 *
 * Usage: node deploy/local/verify-all-sites.cjs
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { Client } = require("../contabo/lib/ssh2-client.cjs");
const { diagnoseWinHost } = require("./lib/win-ssh-reachability.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const expected = (() => {
  const php = fs.readFileSync(
    path.join(repoRoot, "apps/rankpublish-site/rankpublish-site.php"),
    "utf8"
  );
  return (php.match(/define\(\s*'RPSITE_VERSION',\s*'([^']+)'/) || [])[1] || "?";
})();

const TARGETS = [
  {
    id: "staging",
    url: "https://nashir.satest.top/",
    kind: "nashir-ssh",
  },
  {
    id: "rankpublish.local",
    url: "https://rankpublish.local/",
    kind: "win-ssh",
    publicEnv: "RANKPUBLISH_WIN_PUBLIC",
    defaultPublic: "C:/Users/drmoh/Local Sites/rankpublish/app/public",
  },
  {
    id: "rankpublish-test.local",
    url: "https://rankpublish-test.local/",
    kind: "win-ssh",
    publicEnv: "RANKPUBLISH_WIN_PUBLIC_TEST",
    defaultPublic: "C:/Users/drmoh/Local Sites/rankpublish-test/app/public",
  },
  {
    id: "cloud-local",
    url: "http://127.0.0.1:8080/",
    kind: "docker",
  },
];

function curlHead(url) {
  const r = spawnSync("curl", ["-sfI", "--connect-timeout", "8", url], { encoding: "utf8" });
  return r.status === 0;
}

function resolvePrivateKey() {
  const inline = process.env.RANKPUBLISH_WIN_SSH_PRIVATE_KEY;
  if (inline && inline.includes("BEGIN")) return inline.replace(/\\n/g, "\n");
  const keyRef = process.env.RANKPUBLISH_WIN_SSH_KEY;
  if (keyRef && keyRef.includes("BEGIN")) return keyRef.replace(/\\n/g, "\n");
  if (keyRef && fs.existsSync(keyRef)) return fs.readFileSync(keyRef, "utf8");
  return undefined;
}

function sshExec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
      stream.on("close", (code) => (code ? reject(new Error(out || `exit ${code}`)) : resolve(out)));
    });
  });
}

function nashirVerify() {
  const host = process.env.NASHIR_SSH_HOST;
  const username = process.env.NASHIR_SSH_USER;
  const password = process.env.NASHIR_SSH_PASS;
  if (!host || !username || !password) {
    return Promise.resolve({ http: curlHead("https://nashir.satest.top/"), version: null, note: "no SSH" });
  }
  const remoteRoot =
    process.env.NASHIR_REMOTE_ROOT ||
    `/home/${username}/nashirwp/public_html`;
  const conn = new Client();
  return new Promise((resolve) => {
    conn
      .on("ready", async () => {
        try {
          const out = await sshExec(
            conn,
            `cd ${remoteRoot} && wp eval 'echo defined("RPSITE_VERSION")?RPSITE_VERSION:"missing";' --allow-root 2>/dev/null || grep RPSITE_VERSION wp-content/plugins/rankpublish-site/rankpublish-site.php | head -1`
          );
          const version = (out.match(/1\.\d+\.\d+/) || [])[0] || out.trim();
          conn.end();
          resolve({ http: true, version, note: "SSH OK" });
        } catch (e) {
          conn.end();
          resolve({ http: curlHead("https://nashir.satest.top/"), version: null, note: e.message });
        }
      })
      .on("error", (e) => resolve({ http: curlHead("https://nashir.satest.top/"), version: null, note: e.message }));
    conn.connect({ host, port: 22, username, password, readyTimeout: 30000 });
  });
}

function winVerify(target) {
  const host = process.env.RANKPUBLISH_WIN_SSH_HOST;
  const username = process.env.RANKPUBLISH_WIN_SSH_USER || "rp-cursor";
  const privateKey = resolvePrivateKey();
  const password = process.env.RANKPUBLISH_WIN_SSH_PASS;
  if (!host) {
    return Promise.resolve({ http: false, version: null, note: "RANKPUBLISH_WIN_SSH_HOST not in env" });
  }
  const sshPort = Number(process.env.RANKPUBLISH_WIN_SSH_PORT || 22);
  const reach = diagnoseWinHost(host, sshPort);
  if (!reach.reachable) {
    return Promise.resolve({
      http: false,
      version: null,
      note: reach.note,
      guidance: reach.guidance,
    });
  }
  const winPath = (process.env[target.publicEnv] || target.defaultPublic).replace(/\//g, "\\");
  const pluginPhp = `${winPath}\\wp-content\\plugins\\rankpublish-site\\rankpublish-site.php`;
  const conn = new Client();
  const opts = {
    host,
    port: sshPort,
    username,
    readyTimeout: 30000,
  };
  if (privateKey) opts.privateKey = privateKey;
  else if (password) opts.password = password;
  else return Promise.resolve({ http: false, version: null, note: "no SSH key/pass" });

  return new Promise((resolve) => {
    conn
      .on("ready", async () => {
        try {
          const out = await sshExec(conn, `findstr RPSITE_VERSION "${pluginPhp}"`);
          const version = (out.match(/1\.\d+\.\d+/) || [])[0] || null;
          conn.end();
          resolve({ http: false, version, note: "SSH OK (local HTTP not reachable from cloud)" });
        } catch (e) {
          conn.end();
          resolve({ http: false, version: null, note: e.message });
        }
      })
      .on("error", (e) => resolve({ http: false, version: null, note: e.message }));
    conn.connect(opts);
  });
}

function dockerVerify() {
  try {
    const dockerWp = require("./lib/docker-wp.cjs");
    const r = dockerWp.wp(["eval", 'echo defined("RPSITE_VERSION")?RPSITE_VERSION:"missing";'], { allowFail: true });
    const text = typeof r === "string" ? r : r.stdout || "";
    const version = text.match(/1\.\d+\.\d+/)?.[0] || null;
    return Promise.resolve({
      http: curlHead("http://127.0.0.1:8080/"),
      version,
      note: version ? "docker OK" : "plugin missing",
    });
  } catch (e) {
    return Promise.resolve({ http: curlHead("http://127.0.0.1:8080/"), version: null, note: e.message });
  }
}

async function main() {
  console.log(`\nVerify all sites (expected v${expected})\n${"=".repeat(44)}`);
  const rows = [];

  for (const t of TARGETS) {
    let result;
    if (t.kind === "nashir-ssh") result = await nashirVerify();
    else if (t.kind === "win-ssh") {
      result = await winVerify(t);
      result.targetPath = process.env[t.publicEnv] || t.defaultPublic;
    } else if (t.kind === "docker") result = await dockerVerify();
    else result = { http: false, version: null, note: "unknown" };

    const versionOk = result.version === expected;
    const status = versionOk ? "OK" : result.version ? `WRONG (${result.version})` : "NO ACCESS";
    rows.push({ site: t.id, url: t.url, status, http: result.http, note: result.note });

    console.log(`\n${t.id}`);
    console.log(`  URL:     ${t.url}`);
    console.log(`  HTTP:    ${result.http ? "reachable" : "not from cloud"}`);
    console.log(`  Version: ${result.version || "?"} ${versionOk ? "PASS" : "FAIL"}`);
    if (result.note) console.log(`  Note:    ${result.note}`);
    if (result.guidance) {
      console.log("  Fix:");
      for (const line of String(result.guidance).split("\n")) {
        console.log(`    ${line}`);
      }
    }
  }

  console.log("\nSummary:");
  for (const r of rows) {
    console.log(`  ${r.site.padEnd(24)} ${r.status}`);
  }

  const allOk = rows.every((r) => r.status === "OK");
  if (!allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
