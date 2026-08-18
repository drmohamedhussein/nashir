const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;

const command =
  "bash -lc 'grep -R -n -E \"DATABASE_URL|AUTH_SECRET|CRON_SECRET\" /home/7CvmqqaIv1y9ddCw --include=\".env*\" 2>/dev/null || true'";

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(command, (err, stream) => {
      if (err) {
        console.error(err.message || err);
        conn.end();
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .on("error", (error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
