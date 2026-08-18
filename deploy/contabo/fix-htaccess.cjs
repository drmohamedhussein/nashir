const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));
const u = process.env.NASHIR_SSH_USER;
const h = `/home/${u}`;

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

const c = new Client();
c.on("ready", async () => {
  await exec(
    c,
    [
      `rm -f ${h}/nashirwp/conf/openlitespeed/rewrites.conf ${h}/nashirwp/conf/openlitespeed/rewrites/rankpublish-saas.conf ${h}/nashirwp/conf/openlitespeed/rewrites/000-rankpublish-saas.conf`,
      `head -5 ${h}/nashirwp/public_html/.htaccess`,
      `cd ${h}/nashirwp/public_html && wp cache flush`,
      "curl -s https://nashir.satest.top/api/health",
      "echo",
      "tail -5 /home/" + u + "/nashirwp/logs/error.log",
    ].join(" && "),
  );
  c.end();
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: u,
  password: process.env.NASHIR_SSH_PASS,
});
