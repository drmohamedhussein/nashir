/**
 * Sync / exec on Windows LocalWP via Contabo reverse-SSH tunnel.
 *
 * Prerequisites:
 *   1. OpenSSH Server running on Windows (sshd)
 *   2. On Windows: .\rp-local.cmd cloud-tunnel   (keeps -R 2222:localhost:22 to Contabo)
 *   3. NASHIR_SSH_* + RANKPUBLISH_WIN_SSH_* secrets in Cloud Agent
 *
 * Usage:
 *   node deploy/local/sync-via-contabo-tunnel.cjs --site rankpublish
 *   node deploy/local/sync-via-contabo-tunnel.cjs --site rankpublish-test
 *   node deploy/local/sync-via-contabo-tunnel.cjs --all
 *   node deploy/local/sync-via-contabo-tunnel.cjs --probe
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("../contabo/lib/ssh2-client.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "apps/rankpublish-site");
const TUNNEL_PORT = Number(process.env.RANKPUBLISH_WIN_TUNNEL_PORT || 2222);

const SITE_PATHS = {
  rankpublish: {
    public: process.env.RANKPUBLISH_WIN_PUBLIC || "",
  },
  "rankpublish-test": {
    public: process.env.RANKPUBLISH_WIN_PUBLIC_TEST || "",
  },
};

function resolvePrivateKey() {
  const inline = process.env.RANKPUBLISH_WIN_SSH_PRIVATE_KEY;
  if (inline && inline.includes("BEGIN")) return inline.replace(/\\n/g, "\n");
  return undefined;
}

function walk(dir, base = dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, files);
    else files.push({ full, rel: path.relative(base, full).replace(/\\/g, "/") });
  }
  return files;
}

function exec(conn, command) {
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

function putKeyOnContabo(conn, keyBody) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const remote = "/home/" + process.env.NASHIR_SSH_USER + "/.ssh/rankpublish-agent/win_id";
      // NASHIR user home may not match env string if redacted — use ~
      const remoteTilde = "~/.ssh/rankpublish-agent/win_id";
      exec(conn, "mkdir -p ~/.ssh/rankpublish-agent && chmod 700 ~/.ssh/rankpublish-agent")
        .then(() => {
          // Resolve absolute path
          return exec(conn, "echo $HOME");
        })
        .then((home) => {
          const abs = `${home.trim()}/.ssh/rankpublish-agent/win_id`;
          const tmp = `/tmp/win_id_${Date.now()}`;
          fs.writeFileSync(tmp, keyBody.endsWith("\n") ? keyBody : keyBody + "\n", { mode: 0o600 });
          sftp.fastPut(tmp, abs, (e) => {
            try {
              fs.unlinkSync(tmp);
            } catch {
              /* ignore */
            }
            if (e) return reject(e);
            exec(conn, `chmod 600 "${abs}" && echo ${abs}`)
              .then((p) => resolve(p.trim()))
              .catch(reject);
          });
        })
        .catch(reject);
    });
  });
}

function winUser() {
  const u = process.env.RANKPUBLISH_WIN_SSH_USER;
  if (!u) throw new Error("RANKPUBLISH_WIN_SSH_USER required");
  return u;
}

async function probe(conn, keyPath) {
  const user = winUser();
  const out = await exec(
    conn,
    `ssh -i "${keyPath}" -p ${TUNNEL_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes -o ConnectTimeout=8 ${user}@127.0.0.1 "echo TUNNEL_OK && whoami"`
  );
  return out;
}

async function uploadSite(conn, keyPath, siteKey, publicPath) {
  const user = winUser();
  const remotePluginUnix = `${publicPath.replace(/\\/g, "/")}/wp-content/plugins/rankpublish-site`;
  const pluginPhpWin = `${publicPath.replace(/\//g, "\\")}\\wp-content\\plugins\\rankpublish-site\\rankpublish-site.php`;
  const files = walk(source);

  // Ensure remote dirs via Windows ssh
  await exec(
    conn,
    `ssh -i "${keyPath}" -p ${TUNNEL_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes ${user}@127.0.0.1 "powershell -NoProfile -Command \\"New-Item -ItemType Directory -Force -Path '${remotePluginUnix.replace(/'/g, "''")}' | Out-Null\\""`
  );

  // Tar locally, scp via Contabo jump to Windows temp, expand
  const tarPath = `/tmp/rpsite-${siteKey}.tgz`;
  const { spawnSync } = require("child_process");
  const tar = spawnSync(
    "tar",
    ["-czf", tarPath, "-C", source, "."],
    { encoding: "utf8" }
  );
  if (tar.status !== 0) throw new Error(tar.stderr || "tar failed");

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const remoteTar = `/tmp/rpsite-${siteKey}.tgz`;
      sftp.fastPut(tarPath, remoteTar, (e) => (e ? reject(e) : resolve(remoteTar)));
    });
  });

  // Copy tar to Windows via scp through localhost tunnel, then expand with tar if available or PowerShell
  const winTar = `C:/Users/${user}/AppData/Local/Temp/rpsite-${siteKey}.tgz`;
  await exec(
    conn,
    `scp -i "${keyPath}" -P ${TUNNEL_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null /tmp/rpsite-${siteKey}.tgz ${user}@127.0.0.1:"${winTar}"`
  );

  // Prefer tar.exe on Windows 10+, else fall back to per-file is already complex — use tar
  await exec(
    conn,
    `ssh -i "${keyPath}" -p ${TUNNEL_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@127.0.0.1 "powershell -NoProfile -Command \\"New-Item -ItemType Directory -Force -Path '${remotePluginUnix}' | Out-Null; if (Get-Command tar -ErrorAction SilentlyContinue) { tar -xzf '${winTar}' -C '${remotePluginUnix}' } else { throw 'tar.exe required' }; Remove-Item -Force '${winTar}' -ErrorAction SilentlyContinue\\""`
  );

  const ver = await exec(
    conn,
    `ssh -i "${keyPath}" -p ${TUNNEL_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@127.0.0.1 "findstr RPSITE_VERSION \\"${pluginPhpWin}\\""`
  );
  console.log(`Synced ${siteKey} (${files.length} files). Remote:`, (ver.match(/1\.\d+\.\d+/) || ["?"])[0]);
}

async function main() {
  const probeOnly = process.argv.includes("--probe");
  const syncAll = process.argv.includes("--all");
  const siteArg =
    process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
    (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : null);

  const nHost = process.env.NASHIR_SSH_HOST;
  const nUser = process.env.NASHIR_SSH_USER;
  const nPass = process.env.NASHIR_SSH_PASS;
  const winKey = resolvePrivateKey();
  if (!nHost || !nUser || !nPass) {
    console.error("Missing NASHIR_SSH_*");
    process.exit(1);
  }
  if (!winKey) {
    console.error("Missing RANKPUBLISH_WIN_SSH_PRIVATE_KEY");
    process.exit(1);
  }

  const sites = probeOnly
    ? []
    : syncAll
      ? Object.keys(SITE_PATHS)
      : siteArg
        ? [siteArg]
        : ["rankpublish"];

  for (const key of sites) {
    if (!SITE_PATHS[key]) {
      console.error("Unknown site:", key);
      process.exit(1);
    }
    if (!SITE_PATHS[key].public) {
      console.error("Missing public path env for", key);
      process.exit(1);
    }
  }

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", () => resolve())
      .on("error", reject)
      .connect({ host: nHost, port: 22, username: nUser, password: nPass, readyTimeout: 30000 });
  });

  console.log("Connected to Contabo jump host");
  let keyPath;
  try {
    keyPath = await putKeyOnContabo(conn, winKey);
    console.log("Windows key staged on Contabo");

    // Is tunnel listening?
    try {
      const listen = await exec(conn, `ss -tln | grep ':${TUNNEL_PORT} ' || netstat -tln | grep ':${TUNNEL_PORT} ' || true`);
      if (!listen.includes(String(TUNNEL_PORT))) {
        console.error(`\nNo reverse tunnel on Contabo :${TUNNEL_PORT}`);
        console.error("On your Windows PC run (keep window open):");
        console.error("  .\\rp-local.cmd cloud-tunnel\n");
        process.exit(3);
      }
      console.log("Tunnel port open on Contabo:", listen.trim());
    } catch {
      /* continue to probe */
    }

    const p = await probe(conn, keyPath);
    console.log("Windows via tunnel:", p.trim());
    if (probeOnly) {
      conn.end();
      return;
    }

    for (const key of sites) {
      console.log(`\nUploading ${key}…`);
      await uploadSite(conn, keyPath, key, SITE_PATHS[key].public);
    }
    console.log("\nDone.");
  } catch (e) {
    console.error("\nTunnel access failed:", e.message);
    console.error("\nOn Windows (Admin once if needed):");
    console.error("  1. Ensure OpenSSH Server is running (rp-local.cmd setup-ssh / agent-setup)");
    console.error("  2. Keep this running:  .\\rp-local.cmd cloud-tunnel");
    process.exit(1);
  } finally {
    try {
      if (keyPath) await exec(conn, `rm -f "${keyPath}"`);
    } catch {
      /* ignore */
    }
    conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
