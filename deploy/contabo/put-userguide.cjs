const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const local = path.resolve(__dirname, "../../apps/rankpublish-site/includes/user-guide.php");
const remote =
  "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html/wp-content/plugins/rankpublish-site/includes/user-guide.php";

const conn = new Client();
conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      sftp.fastPut(local, remote, (e) => {
        if (e) throw e;
        console.log("put user-guide.php");
        conn.exec(
          "cd /home/7CvmqqaIv1y9ddCw/nashirwp/public_html && wp cache flush || true; wp litespeed-purge all 2>/dev/null || true",
          (e2, stream) => {
            if (e2) throw e2;
            stream.on("close", () => {
              console.log("flushed");
              conn.end();
            });
            stream.resume();
          }
        );
      });
    });
  })
  .connect({ host, port: 22, username, password });
