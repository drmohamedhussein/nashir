const { Client } = require(require("path").join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));
const conn = new Client();
const cmd = [
  "cd /home/7CvmqqaIv1y9ddCw/nashirwp/public_html",
  "wp option get home",
  "wp eval 'echo (class_exists(\"Nashir_License\") && Nashir_License::is_vendor_site()) ? \"vendor-yes\" : \"vendor-no\";'",
  "wp option get nashir_license_mode",
  "ls -la wp-content/themes/nashir/assets/art",
  "ls -la wp-content/uploads/nashir/nashir.zip",
].join(" && ");
conn
  .on("ready", () => {
    conn.exec(cmd, (e, stream) => {
      if (e) {
        console.error(e);
        conn.end();
        return;
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", () => conn.end());
    });
  })
  .connect({
    host: process.env.NASHIR_SSH_HOST,
    port: 22,
    username: process.env.NASHIR_SSH_USER,
    password: process.env.NASHIR_SSH_PASS,
  });
