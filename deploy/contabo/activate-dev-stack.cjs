const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const root = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const wp = `cd ${root} && wp`;

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(String(code))) : resolve()));
    });
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await exec(
        conn,
        [
          `${wp} plugin deactivate rankpublish 2>/dev/null || true`,
          `${wp} plugin activate rankpublish-site`,
          `${wp} plugin activate wp-scheduled-posts wp-scheduled-posts-pro thinkrank 2>/dev/null || true`,
          `${wp} plugin activate thinkrank-pro 2>/dev/null || true`,
          `${wp} plugin list --fields=name,status,version`,
          `${wp} cache flush`,
        ].join(" && ")
      );
      conn.end();
    } catch (e) {
      console.error(e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({
    host: process.env.NASHIR_SSH_HOST,
    port: 22,
    username: process.env.NASHIR_SSH_USER,
    password: process.env.NASHIR_SSH_PASS,
    readyTimeout: 60000,
  });
