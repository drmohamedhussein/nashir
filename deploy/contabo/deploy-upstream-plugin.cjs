/**
 * Upload one upstream GPL plugin folder to staging (dev stack source).
 *
 * Usage: node deploy/contabo/deploy-upstream-plugin.cjs thinkrank-pro
 * Env: NASHIR_SSH_HOST, NASHIR_SSH_USER, NASHIR_SSH_PASS
 * Optional: RANKPUBLISH_PLUGINS_DIR
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const slug = process.argv[2];
const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const pluginsDir =
  process.env.RANKPUBLISH_PLUGINS_DIR ||
  "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins";

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}: ${command}`)) : resolve()));
    });
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

if (!slug) {
  console.error("Usage: node deploy-upstream-plugin.cjs <plugin-slug>");
  process.exit(1);
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

const localDir = path.join(pluginsDir, slug);
if (!fs.existsSync(localDir)) {
  console.error("Plugin not found:", localDir);
  process.exit(1);
}

const archive = path.join(os.tmpdir(), `upstream-${slug}.tgz`);
if (fs.existsSync(archive)) fs.unlinkSync(archive);

const pack = spawnSync("tar", ["-czf", archive, "-C", pluginsDir, slug], {
  stdio: "inherit",
  windowsHide: true,
});
if (pack.status) process.exit(pack.status);

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const remoteArchive = `/tmp/upstream-${slug}.tgz`;
      await put(sftp, archive, remoteArchive);
      const wp = `cd ${remoteRoot} && wp`;
      await exec(
        conn,
        [
          `cd ${remoteRoot}/wp-content/plugins`,
          `rm -rf ${slug}.bak`,
          `if [ -d ${slug} ]; then mv ${slug} ${slug}.bak; fi`,
          `tar -xzf ${remoteArchive} -C ${remoteRoot}/wp-content/plugins`,
          `${wp} plugin activate ${slug}`,
          `${wp} plugin list --fields=name,status,version --name=${slug}`,
          `${wp} cache flush || true`,
        ].join(" && ")
      );
      console.log("done");
      conn.end();
    } catch (e) {
      console.error(e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password, readyTimeout: 180000 });
