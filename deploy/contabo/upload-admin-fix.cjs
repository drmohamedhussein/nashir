const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const local = path.resolve(__dirname, "../../apps/rankpublish-site/includes/class-admin.php");
const remote = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html/wp-content/plugins/rankpublish-site/includes/class-admin.php";

const c = new Client();
c.on("ready", () => {
  c.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(local, remote, (e) => {
      if (e) {
        console.error(e);
        process.exit(1);
      }
      console.log("Uploaded class-admin.php");
      c.end();
    });
  });
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: process.env.NASHIR_SSH_USER,
  password: process.env.NASHIR_SSH_PASS,
});
