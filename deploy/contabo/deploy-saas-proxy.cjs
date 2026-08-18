/**
 * Deploy SaaS PHP proxy mu-plugin to live WordPress.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const wpRoot = process.env.NASHIR_WP_ROOT || `/home/${username}/nashirwp/public_html`;
const local = path.resolve(__dirname, "../../wordpress/mu-plugins/rankpublish-saas-proxy.php");

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve()));
    });
  });
}

function put(sftp, localPath, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(localPath, remote, (e) => (e ? reject(e) : resolve())));
}

const c = new Client();
c.on("ready", async () => {
  const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
  await exec(c, `mkdir -p ${wpRoot}/wp-content/mu-plugins`);
  await put(sftp, local, `${wpRoot}/wp-content/mu-plugins/rankpublish-saas-proxy.php`);
  await exec(
    c,
    [
      `cd ${wpRoot}`,
      "wp option update rankpublish_saas_port 3001",
      "wp cache flush || true",
      "curl -s https://nashir.satest.top/api/health | head -c 200",
      "curl -sI https://nashir.satest.top/register | head -6",
    ].join(" && "),
  );
  console.log("\n✓ SaaS proxy mu-plugin deployed");
  c.end();
}).connect({ host, port: 22, username, password });
