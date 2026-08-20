/**
 * Sync rankpublish-site to Windows LocalWP via SFTP/SSH.
 *
 * Usage:
 *   node deploy/local/sync-via-ssh.cjs --site rankpublish
 *   node deploy/local/sync-via-ssh.cjs --site rankpublish-test
 *   node deploy/local/sync-via-ssh.cjs --all
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("../contabo/lib/ssh2-client.cjs");
const { diagnoseWinHost } = require("./lib/win-ssh-reachability.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "apps/rankpublish-site");

const SITE_PATHS = {
  rankpublish: {
    public: process.env.RANKPUBLISH_WIN_PUBLIC || "C:/Users/drmoh/Local Sites/rankpublish/app/public",
    url: "https://rankpublish.local/",
  },
  "rankpublish-test": {
    public:
      process.env.RANKPUBLISH_WIN_PUBLIC_TEST ||
      "C:/Users/drmoh/Local Sites/rankpublish-test/app/public",
    url: "https://rankpublish-test.local/",
  },
};

const siteArg =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : null);
const syncAll = process.argv.includes("--all");

const host = process.env.RANKPUBLISH_WIN_SSH_HOST;
const username = process.env.RANKPUBLISH_WIN_SSH_USER || "rp-cursor";
const password = process.env.RANKPUBLISH_WIN_SSH_PASS;

function resolvePrivateKey() {
  const inline = process.env.RANKPUBLISH_WIN_SSH_PRIVATE_KEY;
  if (inline && inline.includes("BEGIN")) return inline.replace(/\\n/g, "\n");
  const keyRef = process.env.RANKPUBLISH_WIN_SSH_KEY;
  if (keyRef && keyRef.includes("BEGIN")) return keyRef.replace(/\\n/g, "\n");
  if (keyRef && fs.existsSync(keyRef)) return fs.readFileSync(keyRef, "utf8");
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

function uploadSite(conn, siteKey, publicPath) {
  const remotePlugin = `${publicPath.replace(/\\/g, "/")}/wp-content/plugins/rankpublish-site`;
  const files = walk(source);
  const pluginPhp = `${publicPath.replace(/\\/g, "\\")}\\wp-content\\plugins\\rankpublish-site\\rankpublish-site.php`;

  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      let i = 0;
      const next = () => {
        if (i >= files.length) {
          console.log(`\nUploaded ${files.length} files → ${siteKey}`);
          exec(conn, `findstr RPSITE_VERSION "${pluginPhp}"`)
            .then((out) => {
              console.log("Remote version:", (out.match(/1\.\d+\.\d+/) || ["?"])[0]);
              resolve();
            })
            .catch(() => resolve());
          return;
        }
        const file = files[i++];
        const remote = `${remotePlugin}/${file.rel}`.replace(/\\/g, "/");
        const remoteDir = path.posix.dirname(remote);
        sftp.mkdir(remoteDir, { mode: 0o755 }, () => {
          sftp.fastPut(file.full, remote, (e) => {
            if (e) return reject(new Error(`Upload failed ${remote}: ${e.message}`));
            process.stdout.write(".");
            next();
          });
        });
      };
      console.log(`SFTP sync ${siteKey} →`, remotePlugin);
      next();
    });
  });
}

if (!host) {
  console.error("Missing RANKPUBLISH_WIN_SSH_HOST");
  process.exit(1);
}

const sshPort = Number(process.env.RANKPUBLISH_WIN_SSH_PORT || 22);
const reach = diagnoseWinHost(host, sshPort);
if (!reach.reachable) {
  console.error("\nWindows SSH unreachable from this Cloud Agent.\n");
  console.error(reach.note);
  if (reach.guidance) console.error("\n" + reach.guidance + "\n");
  process.exit(2);
}

const privateKey = resolvePrivateKey();
const connectOpts = {
  host,
  port: sshPort,
  username,
  readyTimeout: 60000,
};
if (privateKey) connectOpts.privateKey = privateKey;
else if (password) connectOpts.password = password;
else {
  console.error("Need RANKPUBLISH_WIN_SSH_PRIVATE_KEY or RANKPUBLISH_WIN_SSH_PASS");
  process.exit(1);
}

const sites = syncAll
  ? Object.keys(SITE_PATHS)
  : siteArg
    ? [siteArg]
    : ["rankpublish"];

for (const key of sites) {
  if (!SITE_PATHS[key]) {
    console.error("Unknown site:", key);
    process.exit(1);
  }
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      for (const key of sites) {
        await uploadSite(conn, key, SITE_PATHS[key].public);
      }
      conn.end();
    } catch (e) {
      console.error(e.message);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  });

console.log("Connecting SSH", host, "as", username);
conn.connect(connectOpts);
