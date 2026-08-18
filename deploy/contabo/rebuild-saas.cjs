const crypto = require("crypto");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const wp = `/home/${username}/nashirwp/public_html`;
const web = `/home/${username}/nashir/apps/web`;
const adminPass = crypto.randomBytes(12).toString("base64url");

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

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await exec(conn, `cd ${wp} && wp user update admin --user_pass='${adminPass}'`);
      await exec(
        conn,
        [
          `cd ${web}`,
          "rm -rf .next",
          "npx prisma generate",
          "npm run build",
          "pm2 restart nashir --update-env",
          "sleep 5",
          "curl -s http://127.0.0.1:3001/api/health",
          "echo",
          "curl -sI https://nashir.satest.top/ | head -10",
          "curl -sI https://nashir.satest.top/register | head -8",
        ].join(" && "),
      );
      console.log("\n✓ WP admin: admin / " + adminPass);
      conn.end();
    } catch (e) {
      console.error(e.message || e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password });
