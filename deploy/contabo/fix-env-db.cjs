const path = require("path");
const fs = require("fs");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));
const u = process.env.NASHIR_SSH_USER;
const web = `/home/${u}/nashir/apps/web`;
const envLocal = path.resolve(__dirname, "../../apps/web/.env");

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

const c = new Client();
c.on("ready", async () => {
  const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
  // Strip UTF-8 BOM and fix APP_URL
  let env = fs.readFileSync(envLocal, "utf8").replace(/^\uFEFF/, "");
  env = env.replace(/^APP_URL=.*/m, "APP_URL=https://nashir.satest.top");
  const tmp = path.join(require("os").tmpdir(), "nashir-web.env");
  fs.writeFileSync(tmp, env, "utf8");
  await put(sftp, tmp, `${web}/.env`);

  c.exec(
    [
      `cd ${web}`,
      "head -c 3 .env | od -An -tx1",
      "npx prisma db push 2>&1 | tail -8",
      "pm2 restart nashir",
      "sleep 3",
      "curl -s 'https://nashir.satest.top/api/health?n='$(date +%s)",
    ].join(" && "),
    (err, s) => {
      s.on("data", (d) => process.stdout.write(d));
      s.stderr.on("data", (d) => process.stderr.write(d));
      s.on("close", () => c.end());
    },
  );
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: u,
  password: process.env.NASHIR_SSH_PASS,
});
