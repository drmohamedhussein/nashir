/**
 * Upload and run safe schema SQL on staging (never drops wp_* tables).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || `/home/${username}/nashir`;
const here = __dirname;

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

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      await put(sftp, path.join(here, "staging-schema-safe.sql"), "/tmp/staging-schema-safe.sql");
      await put(sftp, path.join(here, "run-staging-schema-safe.cjs"), "/tmp/run-staging-schema-safe.cjs");
      await exec(conn, `cp /tmp/staging-schema-safe.sql ${remoteRoot}/deploy/contabo/staging-schema-safe.sql`);
      await exec(conn, `cp /tmp/run-staging-schema-safe.cjs ${remoteRoot}/deploy/contabo/run-staging-schema-safe.cjs`);
      await exec(conn, `node ${remoteRoot}/deploy/contabo/run-staging-schema-safe.cjs ${remoteRoot}/apps/web`);
      await exec(conn, `cd ${remoteRoot}/apps/web && node prisma/seed.cjs`);
      console.log("\n✓ Safe schema migration complete");
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
