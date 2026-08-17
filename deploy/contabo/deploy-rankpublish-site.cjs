const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const pluginsDir = "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins";
const siteDir = path.join(pluginsDir, "rankpublish-site");
const productDir = path.join(pluginsDir, "rankpublish");
const archive = path.join(os.tmpdir(), "rankpublish-site.tgz");
const zipPath = "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/uploads/rankpublish/rankpublish.zip";

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
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

if (fs.existsSync(archive)) fs.unlinkSync(archive);
const packSite = spawnSync("tar", ["-czf", archive, "-C", pluginsDir, "rankpublish-site"], {
  stdio: "inherit",
  windowsHide: true,
});
if (packSite.status) process.exit(packSite.status);

if (!fs.existsSync(zipPath)) {
  console.error("Missing product zip at", zipPath);
  process.exit(1);
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      await put(sftp, archive, "/tmp/rankpublish-site.tgz");
      if (fs.existsSync(zipPath)) {
        await exec(conn, `mkdir -p ${remoteRoot}/wp-content/uploads/rankpublish`);
        await put(sftp, zipPath, `${remoteRoot}/wp-content/uploads/rankpublish/rankpublish.zip`);
      }
      const wp = `cd ${remoteRoot} && wp`;
      await exec(
        conn,
        [
          `cd ${remoteRoot}/wp-content/plugins`,
          "rm -rf rankpublish-site.bak",
          "if [ -d rankpublish-site ]; then mv rankpublish-site rankpublish-site.bak; fi",
          `tar -xzf /tmp/rankpublish-site.tgz -C ${remoteRoot}/wp-content/plugins`,
          `${wp} plugin activate rankpublish-site`,
          `${wp} plugin deactivate rankpublish 2>/dev/null || true`,
          `${wp} plugin activate wp-scheduled-posts wp-scheduled-posts-pro thinkrank 2>/dev/null || true`,
          `${wp} plugin activate thinkrank-pro 2>/dev/null || true`,
          `${wp} eval 'if (class_exists("RankPublish_Site_Plugin")) { RankPublish_Site_Plugin::activate(); echo "pages_ok\\n"; }'`,
          `${wp} option get show_on_front`,
          `${wp} option get page_on_front`,
          `${wp} plugin list --fields=name,status --name=rankpublish,rankpublish-site,nashir`,
          `${wp} rewrite flush`,
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
