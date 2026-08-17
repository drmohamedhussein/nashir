/**
 * Fix staging after deploy: ensure .env, build, PM2, nginx split.
 * Requires NASHIR_SSH_* env vars (same as deploy-saas.cjs).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || `/home/${username}/nashir`;
const wpRoot = process.env.NASHIR_WP_ROOT || `/home/${username}/nashirwp/public_html`;
const repoRoot = path.resolve(__dirname, "../..");
const webDir = path.join(repoRoot, "apps/web");
const appPort = process.env.NASHIR_APP_PORT || "3001";
const stagingUrl = "https://nashir.satest.top";

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

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

const ecosystemJs = path.join(os.tmpdir(), "ecosystem.config.js");
fs.writeFileSync(
  ecosystemJs,
  `module.exports = {
  apps: [{
    name: "nashir",
    cwd: "${remoteRoot.replace(/\\/g, "/")}/apps/web",
    script: "node_modules/next/dist/bin/next",
    args: "start --hostname 127.0.0.1 --port ${appPort}",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    env: { NODE_ENV: "production", PORT: "${appPort}", APP_URL: "${stagingUrl}" }
  }]
};
`,
);

const nginxLocal = path.join(__dirname, "nginx-nashir-split.conf");

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const envLocal = path.join(webDir, ".env");
      if (fs.existsSync(envLocal)) {
        await put(sftp, envLocal, `${remoteRoot}/apps/web/.env`);
      }
      await put(sftp, ecosystemJs, `${remoteRoot}/deploy/contabo/ecosystem.config.js`);
      await put(sftp, nginxLocal, "/tmp/nginx-nashir-split.conf");

      await exec(
        conn,
        [
          `cd ${remoteRoot}/apps/web`,
          "test -f .env && grep -q DATABASE_URL .env && echo env_ok || (echo MISSING_DATABASE_URL && exit 1)",
          `grep -q '^APP_URL=' .env && sed -i 's|^APP_URL=.*|APP_URL=${stagingUrl}|' .env || echo 'APP_URL=${stagingUrl}' >> .env`,
          "npm run build",
          "pm2 delete nashir ecosystem.runtime 2>/dev/null || true",
          `pm2 start ${remoteRoot}/deploy/contabo/ecosystem.config.js`,
          "pm2 save",
          `curl -sf http://127.0.0.1:${appPort}/api/health || echo health_check_failed`,
        ].join(" && "),
      );

      try {
        await exec(
          conn,
          [
            "NGINX_SITE=$(ls /etc/nginx/sites-enabled/*nashir* 2>/dev/null | head -1)",
            'if [ -n "$NGINX_SITE" ]; then',
            "  sudo cp /tmp/nginx-nashir-split.conf \"$NGINX_SITE\" && sudo nginx -t && sudo systemctl reload nginx && echo nginx_reloaded",
            "else",
            "  echo nginx_manual_required",
            "  ls /etc/nginx/sites-enabled/ 2>/dev/null || true",
            "fi",
          ].join("\n"),
        );
      } catch (e) {
        console.warn("Nginx step skipped:", e.message);
      }

      await exec(conn, [`cd ${wpRoot} && wp option get rankpublish_cloud_url`, "pm2 list"].join(" && "));

      console.log("\n✓ Staging fix complete");
      conn.end();
    } catch (e) {
      console.error(e.message || e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password });
