const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html/wp-content/themes/nashir";
const local = path.resolve(__dirname, "../../apps/wp-theme");

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (full.endsWith(".php")) files.push(full);
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
      stream.on("close", (code) => {
        process.stdout.write(out);
        if (code) reject(new Error("exit " + code));
        else resolve(out);
      });
    });
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
    const put = (l, r) => new Promise((resolve, reject) => sftp.fastPut(l, r, (e) => (e ? reject(e) : resolve())));
    for (const file of walk(local)) {
      const rel = path.relative(local, file).replace(/\\/g, "/");
      await put(file, remoteRoot + "/" + rel);
      console.log("put", rel);
    }
    await exec(
      conn,
      [
        `python3 - <<'PY'
from pathlib import Path
root = Path("${remoteRoot}")
bom = bytes([0xEF, 0xBB, 0xBF])
for path in root.rglob("*.php"):
    data = path.read_bytes()
    if data.startswith(bom):
        path.write_bytes(data[3:])
        print("stripped_bom", path.name)
print("bom_check_done")
PY`,
        "php -l " + remoteRoot + "/functions.php",
        "php -l " + remoteRoot + "/includes/mocks.php",
        "php -l " + remoteRoot + "/includes/i18n.php",
        "php -l " + remoteRoot + "/header.php",
        "cd /home/7CvmqqaIv1y9ddCw/nashirwp/public_html && wp eval 'echo ok;'",
        "cd /home/7CvmqqaIv1y9ddCw/nashirwp/public_html && wp theme list --status=active --field=name",
        "curl -sI https://nashir.satest.top/guide/ | head -12",
      ].join(" && ")
    );
    conn.end();
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
