const fs = require("fs");
const os = require("os");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const mysqlUser = process.env.NASHIR_MYSQL_USER;
const mysqlPass = process.env.NASHIR_MYSQL_PASS;
const web = `/home/${username}/nashir/apps/web`;
const dbUrl = `mysql://${encodeURIComponent(mysqlUser)}:${encodeURIComponent(mysqlPass)}@127.0.0.1:3306/nashirwp_WKBlixyk`;

const envBody = [
  `DATABASE_URL="${dbUrl}"`,
  "APP_URL=\"https://nashir.satest.top\"",
  "AUTH_SECRET=\"f9a15a442d29718a7250f33a576f6e50fbdbbd8f9c6b5c28\"",
  "CRON_SECRET=\"f8dc00622f974fb9aba947497dcdfaddc9b057fd4480008a\"",
  "",
].join("\n");

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

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

const tmp = path.join(os.tmpdir(), "nashir-web.env");
fs.writeFileSync(tmp, envBody);

const c = new Client();
c.on("ready", async () => {
  const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
  await put(sftp, tmp, `${web}/.env`);
  await exec(
    c,
    [
      `cd ${web}`,
      "python3 -c \"import pathlib; t=pathlib.Path('.env').read_text(); print('proto', t.split(':',1)[0]); print('has_mysql', 'mysql://' in t)\"",
      "unset DATABASE_URL",
      "npx prisma generate",
      "node -e \"const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.\\$queryRawUnsafe('SELECT 1 AS x').then(r=>{console.log('ok', r); return p.\\$disconnect();}).catch(e=>{console.error(e.message); process.exit(1);})\"",
      "pm2 delete nashir",
      "pm2 start /home/" + username + "/nashir/deploy/contabo/ecosystem.config.js --update-env",
      "sleep 4",
      "curl -s http://127.0.0.1:3001/api/health",
    ].join(" && "),
  );
  c.end();
}).connect({ host, port: 22, username, password });
