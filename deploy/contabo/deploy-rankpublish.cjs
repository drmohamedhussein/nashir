/**
 * Upload RankPublish plugin to a WordPress install for testing.
 * Customer download zip: use deploy/contabo/upload-product-zip.cjs instead.
 * Do not activate this plugin on the RankPublish HQ (Site Core) site.
 * Env: NASHIR_SSH_HOST, NASHIR_SSH_USER, NASHIR_SSH_PASS
 *
 * Local source: LocalWP rankpublish plugin folder (not the four standalone sources).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const localPlugin =
  process.env.RANKPUBLISH_PLUGIN_DIR ||
  "C:/Users/drmoh/Local Sites/rankpublish-test/app/public/wp-content/plugins/rankpublish";
const archive = path.join(os.tmpdir(), "rankpublish-staging.tgz");

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (errOut += d.toString()));
      stream.on("close", (code) => {
        process.stdout.write(out);
        if (errOut) process.stderr.write(errOut);
        if (code) reject(new Error(`exit ${code}: ${command}\n${errOut}`));
        else resolve(out);
      });
    });
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

if (!fs.existsSync(path.join(localPlugin, "rankpublish.php"))) {
  console.error("RankPublish plugin not found at", localPlugin);
  process.exit(1);
}

if (fs.existsSync(archive)) fs.unlinkSync(archive);
const pack = spawnSync(
  "tar",
  ["-czf", archive, "-C", path.dirname(localPlugin), "rankpublish"],
  { stdio: "inherit", windowsHide: true }
);
if (pack.status !== 0) {
  console.error("tar failed");
  process.exit(pack.status || 1);
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const remoteArchive = "/tmp/rankpublish-staging.tgz";
      console.log("uploading archive…");
      await put(sftp, archive, remoteArchive);
      const wp = `cd ${remoteRoot} && wp`;
      await exec(
        conn,
        [
          `cd ${remoteRoot}/wp-content/plugins`,
          "rm -rf rankpublish.bak",
          "if [ -d rankpublish ]; then mv rankpublish rankpublish.bak; fi",
          `tar -xzf ${remoteArchive} -C ${remoteRoot}/wp-content/plugins`,
          `test -f ${remoteRoot}/wp-content/plugins/rankpublish/rankpublish.php`,
          `${wp} plugin activate rankpublish`,
          `${wp} plugin deactivate wp-scheduled-posts wp-scheduled-posts-pro thinkrank thinkrank-pro 2>/dev/null || true`,
          `${wp} plugin list --fields=name,status,version`,
          "php -r 'echo \"memory_limit=\".ini_get(\"memory_limit\").PHP_EOL; echo \"php=\".PHP_VERSION.PHP_EOL;'",
          `${wp} cache flush || true`,
          `${wp} litespeed-purge all 2>/dev/null || true`,
        ].join(" && ")
      );
      console.log("done");
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
