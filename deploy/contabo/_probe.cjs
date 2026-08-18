const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const u = process.env.NASHIR_SSH_USER;
const web = `/home/${u}/nashir/apps/web`;
const command = [
  "pm2 logs nashir --lines 80 --nostream",
  `test -d ${web}/.next && echo has_next || echo missing_next`,
  `test -f ${web}/src/app/api/rankpublish/bridge/connect/route.ts && echo has_bridge || echo missing_bridge`,
  `curl -sS http://127.0.0.1:3001/api/health || echo curl_fail`,
].join("; ");

const c = new Client();
c.on("ready", () => {
  c.exec(command, (err, s) => {
    if (err) {
      console.error(err);
      c.end();
      return;
    }
    s.on("data", (d) => process.stdout.write(d));
    s.stderr.on("data", (d) => process.stderr.write(d));
    s.on("close", () => c.end());
  });
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: u,
  password: process.env.NASHIR_SSH_PASS,
});
