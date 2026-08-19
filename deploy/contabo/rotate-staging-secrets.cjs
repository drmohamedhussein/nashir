/**
 * Rotate AUTH_SECRET, CRON_SECRET, and the shared WordPress/SaaS MySQL password.
 * Secret values are generated on the server and never printed.
 */
const path = require("path");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || `/home/${username}/nashir`;
const wpRoot = process.env.NASHIR_WP_ROOT || `/home/${username}/nashirwp/public_html`;
const localPy = path.join(__dirname, "rotate-staging-secrets.py");

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

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
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve(out)));
    });
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const remotePy = "/tmp/rotate-staging-secrets.py";
      await put(sftp, localPy, remotePy);
      await exec(
        conn,
        `python3 ${remotePy} ${remoteRoot}/apps/web/.env ${wpRoot}/wp-config.php`,
      );
      await exec(
        conn,
        [
          `cd ${remoteRoot}/apps/web && pm2 restart nashir --update-env`,
          `cd ${wpRoot} && wp cache flush || true`,
          `cd ${wpRoot} && (wp litespeed-purge all || true)`,
          "sleep 3",
          "curl -sS -m 15 http://127.0.0.1:3001/api/health",
          "echo",
          `cd ${wpRoot} && wp eval 'echo get_option("siteurl");'`,
          "echo",
        ].join(" && "),
      );
      console.log("rotate_complete (secret values not printed)");
      conn.end();
    } catch (error) {
      console.error(error.message || error);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
