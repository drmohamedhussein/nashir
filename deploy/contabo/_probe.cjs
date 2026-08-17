const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));
const u = process.env.NASHIR_SSH_USER;

const cmd = [
  "ls -la /etc/serveravatar* 2>&1 | head -10",
  "cat /etc/serveravatar-ols/vhosts/nashir.satest.top.conf 2>&1 | head -80",
  "ls /etc/serveravatar-ols/vhosts/ 2>&1 | head -20",
  "grep -r rewrites /etc/serveravatar-ols 2>&1 | head -15",
].join("\n");

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (err, s) => {
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
