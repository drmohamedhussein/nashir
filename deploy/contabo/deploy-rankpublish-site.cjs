const fs = require("fs");
const path = require("path");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const pluginsDir = process.env.RANKPUBLISH_PLUGINS_DIR || "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins";
const repoSite = path.resolve(__dirname, "../../apps/rankpublish-site");
const siteDir = fs.existsSync(path.join(repoSite, "rankpublish-site.php"))
  ? repoSite
  : path.join(pluginsDir, "rankpublish-site");
const remotePlugin = `${remoteRoot}/wp-content/plugins/rankpublish-site`;
const MAX_FILE_BYTES = 200 * 1024;

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
    const timer = setTimeout(() => reject(new Error("fastPut timeout " + remote)), 30000);
    sftp.fastPut(local, remote, (e) => {
      clearTimeout(timer);
      if (e) reject(e);
      else resolve();
    });
  });
}

function walk(dir, base = dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "." || entry.name === ".." || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, files);
    else files.push({ full, rel: path.relative(base, full).replace(/\\/g, "/") });
  }
  return files;
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

if (!fs.existsSync(path.join(siteDir, "rankpublish-site.php"))) {
  console.error("rankpublish-site.php not found at", siteDir);
  process.exit(1);
}

const files = walk(siteDir);
const skipped = [];
const conn = new Client();
conn
  .on("ready", async () => {
    try {
      console.log("SSH ready, uploading", files.length, "files");
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const dirs = [...new Set(files.map((f) => path.posix.dirname(f.rel)).filter((d) => d && d !== "."))];
      await exec(conn, ["mkdir -p " + remotePlugin].concat(dirs.map((d) => `mkdir -p ${remotePlugin}/${d}`)).join(" && "));
      for (const file of files) {
        const size = fs.statSync(file.full).size;
        if (size > MAX_FILE_BYTES) {
          skipped.push(`${file.rel} (${size})`);
          continue;
        }
        const remote = `${remotePlugin}/${file.rel}`;
        process.stdout.write(`  ${file.rel}\n`);
        await put(sftp, file.full, remote);
      }
      if (skipped.length) {
        console.warn("Skipped large files:\n  " + skipped.join("\n  "));
      }
      console.log("Upload complete, activating on WordPress");
      const wp = `cd ${remoteRoot} && wp`;
      await exec(
        conn,
        [
          `${wp} plugin activate rankpublish-site`,
          `${wp} plugin deactivate rankpublish 2>/dev/null || true`,
          `${wp} plugin activate wp-scheduled-posts wp-scheduled-posts-pro thinkrank 2>/dev/null || true`,
          `${wp} plugin activate thinkrank-pro 2>/dev/null || true`,
          `${wp} eval 'if (class_exists("RankPublish_Site_Plugin")) { RankPublish_Site_Plugin::activate(); echo "pages_ok\\n"; }'`,
          `${wp} eval '$s=(array)get_option("rankpublish_site_core_settings",array());$s["dev_stack_mode"]=false;update_option("rankpublish_site_core_settings",$s);echo "dev_off\\n";'`,
          `${wp} option get show_on_front`,
          `${wp} option get page_on_front`,
          `${wp} plugin list --fields=name,status --name=rankpublish,rankpublish-site,nashir`,
          `${wp} language core install en_US || true`,
          `${wp} site switch-language en_US || true`,
          `${wp} option update blogname "RankPublish"`,
          `${wp} option update blogdescription "Editorial calendar, scheduling, and SEO for WordPress"`,
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
  });
console.log("Connecting SSH", host);
conn.connect({
  host,
  port: 22,
  username,
  password,
  readyTimeout: 30000,
});
