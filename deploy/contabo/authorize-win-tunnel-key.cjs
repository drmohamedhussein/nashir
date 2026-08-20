/**
 * One-shot: authorize Windows Cloud Agent pubkey on Contabo for reverse tunnels.
 * Usage: node deploy/contabo/authorize-win-tunnel-key.cjs
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("./lib/ssh2-client.cjs");
const { spawnSync } = require("child_process");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_*");
  process.exit(1);
}

const keyDir = "/tmp/rp-win-key";
const privPath = path.join(keyDir, "id");
const pubPath = path.join(keyDir, "id.pub");
fs.mkdirSync(keyDir, { recursive: true });

let priv = process.env.RANKPUBLISH_WIN_SSH_PRIVATE_KEY || "";
priv = priv.replace(/\\n/g, "\n");
if (!priv.includes("BEGIN")) {
  console.error("Missing RANKPUBLISH_WIN_SSH_PRIVATE_KEY");
  process.exit(1);
}
if (!priv.endsWith("\n")) priv += "\n";
fs.writeFileSync(privPath, priv, { mode: 0o600 });

const kg = spawnSync("ssh-keygen", ["-y", "-f", privPath], { encoding: "utf8" });
if (kg.status !== 0) {
  console.error(kg.stderr || "ssh-keygen failed");
  process.exit(1);
}
const pub = kg.stdout.trim();
fs.writeFileSync(pubPath, pub + "\n");

const conn = new Client();
conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      const remotePub = `/tmp/rankpublish-cloud-agent.pub`;
      sftp.fastPut(pubPath, remotePub, (e) => {
        if (e) {
          console.error(e);
          process.exit(1);
        }
        const cmd = [
          "mkdir -p ~/.ssh && chmod 700 ~/.ssh",
          "touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys",
          'grep -v "rankpublish-cloud-agent" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp || true',
          "mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys",
          `cat ${remotePub} >> ~/.ssh/authorized_keys`,
          "chmod 600 ~/.ssh/authorized_keys",
          "mkdir -p ~/.ssh/rankpublish-agent && chmod 700 ~/.ssh/rankpublish-agent",
          'echo "keys=$(grep -c rankpublish-cloud-agent ~/.ssh/authorized_keys || true)"',
          "rm -f " + remotePub,
        ].join(" && ");
        conn.exec(cmd, (e2, stream) => {
          if (e2) {
            console.error(e2);
            process.exit(1);
          }
          stream.on("data", (d) => process.stdout.write(d));
          stream.stderr.on("data", (d) => process.stderr.write(d));
          stream.on("close", (code) => {
            console.log(code === 0 ? "Contabo authorized Windows agent key" : "failed");
            conn.end();
            process.exit(code || 0);
          });
        });
      });
    });
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  });

conn.connect({ host, port: 22, username, password, readyTimeout: 30000 });
