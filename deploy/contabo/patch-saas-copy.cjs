const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteWeb = `/home/${username}/nashir/apps/web`;
const repoWeb = path.resolve(__dirname, "../../apps/web");

const files = [
  "src/lib/i18n.ts",
  "src/lib/plans.ts",
  "src/app/app/page.tsx",
  "src/app/app/getting-started/page.tsx",
  "src/app/download/page.tsx",
];

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error("exit " + code)) : resolve()));
    });
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("fastPut timeout " + remote)), 30000);
    sftp.fastPut(local, remote, (e) => {
      clearTimeout(timer);
      if (e) reject(e);
      else resolve();
    });
  });
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      console.log("SSH ready, patching SaaS source");
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      for (const rel of files) {
        const local = path.join(repoWeb, rel);
        const remote = `${remoteWeb}/${rel}`;
        if (!fs.existsSync(local)) {
          throw new Error("missing " + local);
        }
        console.log("  " + rel);
        await put(sftp, local, remote);
      }
      console.log("Building Next.js on server");
      await exec(
        conn,
        [
          `cd ${remoteWeb}`,
          "npx prisma generate",
          "npm run build",
          "pm2 restart nashir",
          "sleep 3",
          "curl -sS http://127.0.0.1:3001/api/health",
          "echo",
        ].join(" && ")
      );
      console.log("saas patch done");
      conn.end();
    } catch (error) {
      console.error(error);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 30000 });
