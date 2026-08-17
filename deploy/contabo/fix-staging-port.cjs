const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const web = "/home/7CvmqqaIv1y9ddCw/nashir/apps/web";
const port = process.env.NASHIR_APP_PORT || "3001";

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, s) => {
      if (err) return reject(err);
      s.on("data", (d) => process.stdout.write(d));
      s.stderr.on("data", (d) => process.stderr.write(d));
      s.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve()));
    });
  });
}

const ecosystem = `module.exports = {
  apps: [{
    name: "nashir",
    cwd: "${web}",
    script: "node_modules/next/dist/bin/next",
    args: "start --hostname 127.0.0.1 --port ${port}",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    env: { NODE_ENV: "production", PORT: "${port}", APP_URL: "https://nashir.satest.top" }
  }]
};`;

const nginx = `# RankPublish SaaS on port ${port}
upstream nashir_next {
  server 127.0.0.1:${port};
  keepalive 32;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name nashir.satest.top;

  ssl_certificate     /etc/letsencrypt/live/nashir.satest.top/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/nashir.satest.top/privkey.pem;
  client_max_body_size 32m;

  root /home/7CvmqqaIv1y9ddCw/nashirwp/public_html;
  index index.php;

  location /_next/ {
    proxy_pass http://nashir_next;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ~ ^/(app|api|login|register|privacy|terms|sitemap\\.xml)(/|$) {
    proxy_pass http://nashir_next;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    try_files $uri $uri/ /index.php?$args;
  }

  location ~ \\.php$ {
    include snippets/fastcgi-php.conf;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
  }
}
`;

const fs = require("fs");
const os = require("os");
const ecoPath = path.join(os.tmpdir(), "ecosystem.config.js");
const ngxPath = path.join(os.tmpdir(), "nginx-nashir-split.conf");
fs.writeFileSync(ecoPath, ecosystem);
fs.writeFileSync(ngxPath, nginx);

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

const c = new Client();
c.on("ready", async () => {
  try {
    const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
    await put(sftp, ecoPath, `${web}/../deploy/contabo/ecosystem.config.js`.replace("/apps/web/../", "/"));
    await put(sftp, ngxPath, "/tmp/nginx-nashir-split.conf");

    await run(c, "pm2 delete nashir 2>/dev/null; true");
    await run(c, `cd ${web} && pm2 start /home/7CvmqqaIv1y9ddCw/nashir/deploy/contabo/ecosystem.config.js`);
    await run(c, "sleep 4");
    await run(c, `curl -sf http://127.0.0.1:${port}/api/health`);
    await run(c, "pm2 save");

    // Find nginx vhost
    await run(
      c,
      `find /etc/nginx /home/7CvmqqaIv1y9ddCw -maxdepth 5 -type f \\( -name '*nashir*' -o -name '*satest*' \\) 2>/dev/null | head -20`,
    );

    c.end();
    console.log(`\n✓ RankPublish running on 127.0.0.1:${port}`);
  } catch (e) {
    console.error(e.message);
    c.end();
    process.exit(1);
  }
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: process.env.NASHIR_SSH_USER,
  password: process.env.NASHIR_SSH_PASS,
});
