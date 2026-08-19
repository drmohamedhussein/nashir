/**
 * Pack the full customer RankPublish plugin (LocalWP rankpublish-test) and
 * upload it as the public download zip. Does not activate the plugin on HQ.
 *
 * Source of truth: rankpublish-test.local  (customer product)
 * Site Core remains HQ-only.
 *
 * Usage: node deploy/contabo/upload-product-zip.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const localPlugin =
  process.env.RANKPUBLISH_PLUGIN_DIR ||
  "C:/Users/drmoh/Local Sites/rankpublish-test/app/public/wp-content/plugins/rankpublish";
const archive = path.join(os.tmpdir(), "rankpublish-product.zip");
const remoteZip = `${remoteRoot}/wp-content/uploads/rankpublish/rankpublish.zip`;

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error("exit " + code + ": " + command)) : resolve(out)));
    });
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("fastPut timeout " + remote)), 180000);
    sftp.fastPut(local, remote, (e) => {
      clearTimeout(timer);
      if (e) reject(e);
      else resolve();
    });
  });
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

if (!fs.existsSync(path.join(localPlugin, "rankpublish.php"))) {
  console.error("Full RankPublish plugin not found at", localPlugin);
  process.exit(1);
}

if (!fs.existsSync(path.join(localPlugin, "modules"))) {
  console.error("Refusing to pack a stub plugin (missing modules/). Source:", localPlugin);
  process.exit(1);
}

if (fs.existsSync(archive)) {
  fs.unlinkSync(archive);
}

const packer = path.join(__dirname, "..", "local", "pack-rankpublish-product.cjs");
const pack = spawnSync(process.execPath, [packer, archive], {
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, RANKPUBLISH_PLUGIN_DIR: localPlugin },
});
if (pack.status !== 0) {
  console.error("zip pack failed");
  process.exit(pack.status || 1);
}

const sizeMb = (fs.statSync(archive).size / (1024 * 1024)).toFixed(1);
if (fs.statSync(archive).size < 6 * 1024 * 1024) {
  console.error("Packed zip is too small (" + sizeMb + " MB). Expected the full product plugin (~8+ MB).");
  process.exit(1);
}
console.log("Packed", archive, sizeMb, "MB");

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      await exec(conn, `mkdir -p ${remoteRoot}/wp-content/uploads/rankpublish`);
      console.log("uploading product zip…");
      await put(sftp, archive, remoteZip);
      const wp = `cd ${remoteRoot} && wp`;
      await exec(
        conn,
        [
          `test -f ${remoteZip}`,
          `stat -c '%s' ${remoteZip}`,
          `${wp} plugin deactivate rankpublish 2>/dev/null || true`,
          `${wp} cache flush || true`,
          `${wp} litespeed-purge all 2>/dev/null || true`,
        ].join(" && ")
      );
      console.log("done — public download: /wp-content/uploads/rankpublish/rankpublish.zip");
      conn.end();
    } catch (error) {
      console.error(error);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 60000 });
