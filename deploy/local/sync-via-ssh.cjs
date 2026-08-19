/**
 * Sync rankpublish-site to Windows LocalWP via SFTP/SSH.
 * Requires env: RANKPUBLISH_WIN_SSH_HOST, RANKPUBLISH_WIN_SSH_USER,
 * and RANKPUBLISH_WIN_SSH_PRIVATE_KEY (inline PEM) or RANKPUBLISH_WIN_SSH_KEY (file path).
 *
 * Optional: RANKPUBLISH_WIN_PUBLIC (default rankpublish Local path on Windows)
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("../contabo/lib/ssh2-client.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "apps/rankpublish-site");
const host = process.env.RANKPUBLISH_WIN_SSH_HOST;
const username = process.env.RANKPUBLISH_WIN_SSH_USER || process.env.USERNAME || "drmoh";
const password = process.env.RANKPUBLISH_WIN_SSH_PASS;

function resolvePrivateKey() {
  const inline = process.env.RANKPUBLISH_WIN_SSH_PRIVATE_KEY;
  if (inline && inline.includes("BEGIN")) {
    return inline.replace(/\\n/g, "\n");
  }
  const keyRef = process.env.RANKPUBLISH_WIN_SSH_KEY;
  if (!keyRef) return undefined;
  if (keyRef.includes("BEGIN")) {
    return keyRef.replace(/\\n/g, "\n");
  }
  if (fs.existsSync(keyRef)) {
    return fs.readFileSync(keyRef, "utf8");
  }
  return undefined;
}

const privateKey = resolvePrivateKey();
const winPublic =
  process.env.RANKPUBLISH_WIN_PUBLIC ||
  "C:/Users/drmoh/Local Sites/rankpublish/app/public";
const remotePlugin = `${winPublic.replace(/\\/g, "/")}/wp-content/plugins/rankpublish-site`;

function walk(dir, base = dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, files);
    else files.push({ full, rel: path.relative(base, full).replace(/\\/g, "/") });
  }
  return files;
}

if (!host) {
  console.error("Missing RANKPUBLISH_WIN_SSH_HOST");
  process.exit(1);
}

const files = walk(source);
const conn = new Client();

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      let i = 0;
      const next = () => {
        if (i >= files.length) {
          console.log(`Uploaded ${files.length} files to ${remotePlugin}`);
          conn.end();
          return;
        }
        const file = files[i++];
        const remote = `${remotePlugin}/${file.rel}`.replace(/\\/g, "/");
        const remoteDir = path.posix.dirname(remote);
        sftp.mkdir(remoteDir, { mode: 0o755 }, () => {
          sftp.fastPut(file.full, remote, (e) => {
            if (e) {
              console.error("Upload failed:", remote, e.message);
              conn.end();
              process.exit(1);
            }
            process.stdout.write(".");
            next();
          });
        });
      };
      console.log("SFTP sync →", remotePlugin);
      next();
    });
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  });

const connectOpts = { host, port: Number(process.env.RANKPUBLISH_WIN_SSH_PORT || 22), username, readyTimeout: 30000 };
if (privateKey) connectOpts.privateKey = privateKey;
else if (password) connectOpts.password = password;
else {
  console.error("Need RANKPUBLISH_WIN_SSH_PRIVATE_KEY, RANKPUBLISH_WIN_SSH_KEY, or RANKPUBLISH_WIN_SSH_PASS");
  process.exit(1);
}

conn.connect(connectOpts);
