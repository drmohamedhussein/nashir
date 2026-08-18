/**
 * Create MySQL database on Contabo and point RankPublish SaaS at it.
 * Uses NASHIR_SSH_* plus NASHIR_MYSQL_USER / NASHIR_MYSQL_PASS.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const mysqlUser = process.env.NASHIR_MYSQL_USER;
const mysqlPass = process.env.NASHIR_MYSQL_PASS;
const dbName = process.env.NASHIR_MYSQL_DB || "nashirwp_WKBlixyk";
const remoteRoot = `/home/${username}/nashir`;
const web = `${remoteRoot}/apps/web`;
const schemaLocal = path.resolve(__dirname, "../../apps/web/prisma/schema.prisma");
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

if (!host || !username || !password || !mysqlUser || !mysqlPass) {
  console.error("Missing NASHIR_SSH_* or NASHIR_MYSQL_USER / NASHIR_MYSQL_PASS");
  process.exit(1);
}

const dbUrl = `mysql://${encodeURIComponent(mysqlUser)}:${encodeURIComponent(mysqlPass)}@127.0.0.1:3306/${dbName}`;
const envBody = [
  `DATABASE_URL="${dbUrl}"`,
  `APP_URL="${stagingUrl}"`,
  `AUTH_SECRET="${process.env.AUTH_SECRET || "f9a15a442d29718a7250f33a576f6e50fbdbbd8f9c6b5c28"}"`,
  `CRON_SECRET="${process.env.CRON_SECRET || "f8dc00622f974fb9aba947497dcdfaddc9b057fd4480008a"}"`,
  "",
].join("\n");

const envTmp = path.join(os.tmpdir(), "nashir-web.env");
fs.writeFileSync(envTmp, envBody, "utf8");

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));

      await exec(
        conn,
        `mysql -u ${JSON.stringify(mysqlUser)} -p${JSON.stringify(mysqlPass)} -e ${JSON.stringify("SHOW DATABASES;")}`,
      );

      await put(sftp, envTmp, `${web}/.env`);
      await put(sftp, schemaLocal, `${web}/prisma/schema.prisma`);

      await exec(
        conn,
        [
          `cd ${web}`,
          "npx prisma generate",
          "npx prisma generate",
          "pm2 restart nashir --update-env",
          "sleep 4",
          "curl -s http://127.0.0.1:3001/api/health",
          "echo",
          `curl -s 'https://nashir.satest.top/api/health?n='$(date +%s)`,
        ].join(" && "),
      );

      console.log("\n✓ MySQL SaaS database ready:", dbName);
      conn.end();
    } catch (e) {
      console.error(e.message || e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password });
