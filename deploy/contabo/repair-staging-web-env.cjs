const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || `/home/${username}/nashir`;
const appUrl = process.env.NASHIR_APP_URL || "https://nashir.satest.top";
const dbUrl = process.env.NASHIR_DATABASE_URL;
const authSecret = process.env.NASHIR_AUTH_SECRET;
const cronSecret = process.env.NASHIR_CRON_SECRET;

if (!host || !username || !password || !dbUrl || !authSecret || !cronSecret) {
  console.error(
    "Missing NASHIR_SSH_* / NASHIR_DATABASE_URL / NASHIR_AUTH_SECRET / NASHIR_CRON_SECRET",
  );
  process.exit(1);
}

const envContent = [
  `DATABASE_URL="${dbUrl}"`,
  `APP_URL="${appUrl}"`,
  `AUTH_SECRET="${authSecret}"`,
  `CRON_SECRET="${cronSecret}"`,
  "",
].join("\n");

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve(out)));
    });
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const escaped = envContent.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      await exec(
        conn,
        `python3 - <<'PY'\nfrom pathlib import Path\nPath("${remoteRoot}/apps/web/.env").write_text("${escaped}", encoding="utf-8")\nprint("env_written")\nPY`,
      );
      await exec(
        conn,
        [
          `cd ${remoteRoot}/apps/web`,
          "npx prisma generate",
          `node ${remoteRoot}/deploy/contabo/run-staging-schema-safe.cjs ${remoteRoot}/apps/web`,
          "node prisma/seed.cjs || true",
          "pm2 restart nashir",
        ].join(" && "),
      );
      conn.end();
    } catch (error) {
      console.error(error.message || error);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
