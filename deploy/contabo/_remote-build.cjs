const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const u = process.env.NASHIR_SSH_USER;
const web = `/home/${u}/nashir/apps/web`;
const command = [
  `cd ${web}`,
  "npx prisma generate",
  "npm run build",
  "pm2 restart nashir",
  "sleep 2",
  "curl -sS http://127.0.0.1:3001/api/health",
  "echo",
  "curl -sS -o /dev/null -w 'bridge_connect_post=%{http_code}\\n' -X POST http://127.0.0.1:3001/api/rankpublish/bridge/connect -H 'Content-Type: application/json' -d '{}'",
].join(" && ");

const c = new Client();
c.on("ready", () => {
  console.log("Building Next.js on server…");
  c.exec(command, (err, s) => {
    if (err) {
      console.error(err);
      c.end();
      process.exit(1);
      return;
    }
    s.on("data", (d) => process.stdout.write(d));
    s.stderr.on("data", (d) => process.stderr.write(d));
    s.on("close", (code) => {
      c.end();
      process.exit(code || 0);
    });
  });
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: u,
  password: process.env.NASHIR_SSH_PASS,
});
