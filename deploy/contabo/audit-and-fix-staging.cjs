/**
 * Full staging audit + nginx/DB fix attempts.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const user = process.env.NASHIR_SSH_USER;
const pass = process.env.NASHIR_SSH_PASS;
const home = `/home/${user}`;
const web = `${home}/nashir/apps/web`;
const wp = `${home}/nashirwp/public_html`;
const port = process.env.NASHIR_APP_PORT || "3001";

function exec(conn, command, tolerate = false) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        if (code && !tolerate) reject(new Error(`exit ${code}`));
        else resolve(out);
      });
    });
  });
}

const nginxSplit = fs.readFileSync(path.join(__dirname, "nginx-nashir-split.conf"), "utf8");

const c = new Client();
c.on("ready", async () => {
  console.log("=== AUDIT ===\n");
  try {
    await exec(c, `whoami; id; pm2 list; curl -s http://127.0.0.1:${port}/api/health || true`, true);
    await exec(
      c,
      [
        `test -f ${wp}/wp-config.php && echo wp_ok || echo wp_missing`,
        `cd ${wp} && wp option get rankpublish_cloud_url 2>/dev/null || true`,
        `cd ${wp} && wp plugin list --status=active --fields=name 2>/dev/null | head -20`,
      ].join(" ; "),
      true,
    );
    await exec(
      c,
      "sudo -n true 2>/dev/null && echo sudo_nopass || echo sudo_needs_pass; ls -la /etc/nginx 2>/dev/null | head -5; ls /etc/nginx/sites-enabled 2>/dev/null; grep -rl nashir.satest.top /etc/nginx 2>/dev/null | head -5",
      true,
    );
    await exec(
      c,
      `find ${home} -maxdepth 6 -type f \\( -name '*.conf' -o -name 'nginx.conf' \\) 2>/dev/null | head -25`,
      true,
    );
    await exec(c, "which psql pg_isready docker 2>/dev/null; systemctl is-active postgresql 2>/dev/null; ss -tlnp | grep -E '5432|3001|3000'", true);

    console.log("\n=== NGINX FIX ATTEMPT ===\n");
    fs.writeFileSync("/tmp/nginx-nashir-split.conf", nginxSplit);
    const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
    await new Promise((res, rej) => sftp.writeFile("/tmp/nginx-nashir-split.conf", nginxSplit, (e) => (e ? rej(e) : res())));

    const nginxTargets = [
      `grep -rl nashir.satest.top /etc/nginx 2>/dev/null | head -1`,
      `ls /etc/nginx/sites-enabled/*nashir* 2>/dev/null | head -1`,
      `ls /etc/nginx/sites-enabled/*satest* 2>/dev/null | head -1`,
      `ls /etc/nginx/conf.d/*nashir* 2>/dev/null | head -1`,
    ].join(" ; ");

    await exec(
      c,
      `TARGET=$(${nginxTargets}); echo nginx_target=$TARGET; if [ -n "$TARGET" ]; then sudo cp /tmp/nginx-nashir-split.conf "$TARGET" && sudo nginx -t && sudo systemctl reload nginx && echo NGINX_OK; else echo NGINX_TARGET_NOT_FOUND; fi`,
      true,
    );

    console.log("\n=== PUBLIC CHECK ===\n");
    await exec(c, "curl -sI https://nashir.satest.top/api/health | head -8; curl -sI https://nashir.satest.top/app | head -8", true);
    c.end();
  } catch (e) {
    console.error("\nERR:", e.message);
    c.end();
    process.exit(1);
  }
}).connect({ host, port: 22, username: user, password: pass });
