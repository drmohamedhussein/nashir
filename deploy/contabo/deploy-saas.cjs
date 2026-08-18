/**
 * Deploy Next.js SaaS to Contabo staging (nashir.satest.top).
 *
 * Run from Windows (NOT on the server):
 *   $env:NASHIR_SSH_HOST='169.58.169.79'
 *   $env:NASHIR_SSH_USER='7CvmqqaIv1y9ddCw'
 *   $env:NASHIR_SSH_PASS='…'
 *   node deploy/contabo/deploy-saas.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || `/home/${username || "7CvmqqaIv1y9ddCw"}/nashir`;
const wpRoot = process.env.NASHIR_WP_ROOT || `/home/${username || "7CvmqqaIv1y9ddCw"}/nashirwp/public_html`;
const repoRoot = path.resolve(__dirname, "../..");
const webDir = path.join(repoRoot, "apps/web");
const archive = path.join(os.tmpdir(), `nashir-web-${Date.now()}.tgz`);
const stagingUrl = "https://nashir.satest.top";
const appPort = process.env.NASHIR_APP_PORT || "3001";

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
  console.error("Missing NASHIR_SSH_HOST / NASHIR_SSH_USER / NASHIR_SSH_PASS");
  process.exit(1);
}

if (!fs.existsSync(path.join(webDir, "package.json"))) {
  console.error("apps/web not found at", webDir);
  process.exit(1);
}

if (fs.existsSync(archive)) {
  try {
    fs.unlinkSync(archive);
  } catch {
    /* ignore locked temp archive */
  }
}
const pack = spawnSync(
  "tar",
  [
    "-czf",
    archive,
    "--exclude=apps/web/node_modules",
    "--exclude=apps/web/.next",
    "--exclude=apps/web/.turbo",
    "-C",
    repoRoot,
    "apps/web",
    "deploy/contabo",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
  },
);
if (pack.status) process.exit(pack.status);
console.log("Archive ready:", archive, `(${(fs.statSync(archive).size / 1024 / 1024).toFixed(1)} MB)`);

const ecosystemLocal = path.join(os.tmpdir(), "ecosystem.config.js");
fs.writeFileSync(
  ecosystemLocal,
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

const conn = new Client();
conn
  .on("ready", async () => {
    console.log("SSH connected, uploading…");
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      await exec(conn, `mkdir -p ${remoteRoot}/deploy/contabo`);
      await put(sftp, archive, "/tmp/nashir-web.tgz");
      await put(sftp, ecosystemLocal, `${remoteRoot}/deploy/contabo/ecosystem.config.js`);

      await exec(
        conn,
        [
          `mkdir -p ${remoteRoot}/deploy/contabo`,
          `mkdir -p ${remoteRoot}`,
          `if [ -f ${remoteRoot}/apps/web/.env ]; then cp ${remoteRoot}/apps/web/.env /tmp/nashir-web.env; fi`,
          `rm -rf ${remoteRoot}/apps/web`,
          `( gzip -dc /tmp/nashir-web.tgz | tar --ignore-zeros -x -C ${remoteRoot} ) || true`,
          `test -f ${remoteRoot}/apps/web/package.json`,
          `if [ -f /tmp/nashir-web.env ]; then cp /tmp/nashir-web.env ${remoteRoot}/apps/web/.env; fi`,
        ].join(" && "),
      );

      await exec(
        conn,
        [
          `test -f ${remoteRoot}/apps/web/.env || echo 'APP_URL=${stagingUrl}' > ${remoteRoot}/apps/web/.env`,
          `grep -q '^APP_URL=' ${remoteRoot}/apps/web/.env && sed -i 's|^APP_URL=.*|APP_URL=${stagingUrl}|' ${remoteRoot}/apps/web/.env || echo 'APP_URL=${stagingUrl}' >> ${remoteRoot}/apps/web/.env`,
          `cd ${remoteRoot}/apps/web`,
          "python3 -c \"u=open('.env').read(); print('db_scheme=' + (u.split('DATABASE_URL=')[1].split('://')[0] if 'DATABASE_URL=' in u else 'missing'))\"",
          "grep -n 'provider' prisma/schema.prisma | head -5",
          "npm ci 2>&1 || npm install",
          "npx prisma generate",
          `node ${remoteRoot}/deploy/contabo/run-staging-schema-safe.cjs ${remoteRoot}/apps/web`,
          "node prisma/seed.cjs || true",
          "npm run build",
          "pm2 delete nashir ecosystem.runtime 2>/dev/null || true",
          `pm2 start ${remoteRoot}/deploy/contabo/ecosystem.config.js`,
          "pm2 save",
        ].join(" && ")
      );

      const wp = `cd ${wpRoot} && wp`;
      await exec(
        conn,
        [
          `${wp} option update rankpublish_cloud_url '${stagingUrl}'`,
          `${wp} rewrite flush`,
          `${wp} cache flush || true`,
        ].join(" && ")
      );

      console.log("\n✓ SaaS deployed to", remoteRoot);
      console.log("  Verify:", `${stagingUrl}/api/health`);
      console.log("  If /app still empty, nginx must proxy /app → :3000 (see deploy/contabo/nginx-nashir-split.conf)");
      conn.end();
    } catch (e) {
      console.error(e.message || e);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
