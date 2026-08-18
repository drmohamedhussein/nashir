/**
 * Reinstall WordPress core tables after accidental Prisma drop.
 * Keeps existing rp_* SaaS tables.
 */
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
      await exec(
        conn,
        [
          `cd ${wp}`,
          "wp core is-installed || wp core install --url=https://nashir.satest.top --title=RankPublish --admin_user=admin --admin_email=admin@nashir.satest.top --admin_password='" +
            adminPass +
            "' --skip-email",
        ].join(" && "),
      );

      await exec(
        conn,
        [
          `cd ${wp}`,
          "wp plugin activate rankpublish-site litespeed-cache 2>/dev/null || true",
          "wp plugin activate wp-scheduled-posts wp-scheduled-posts-pro thinkrank thinkrank-pro 2>/dev/null || true",
          "wp plugin deactivate rankpublish 2>/dev/null || true",
          `wp eval 'if (class_exists("RankPublish_Site_Plugin")) { RankPublish_Site_Plugin::activate(); echo "pages_ok\\n"; }'`,
          "wp option update rankpublish_cloud_url https://nashir.satest.top",
          "wp option update rankpublish_saas_port 3001",
          "wp rewrite flush",
          "wp cache flush || true",
          "wp litespeed-purge all 2>/dev/null || true",
        ].join(" && "),
      );

      await exec(
        conn,
        [
          `cd ${web}`,
          "npx prisma generate",
          "npm run build",
          "pm2 restart nashir --update-env",
          "sleep 5",
          "curl -s http://127.0.0.1:3001/api/health",
          "echo",
          "curl -sI https://nashir.satest.top/ | head -8",
        ].join(" && "),
      );

      console.log("\n✓ WordPress restored. Admin: admin  /  " + adminPass);
      conn.end();
    } catch (e) {
      console.error(e.message || e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password });
