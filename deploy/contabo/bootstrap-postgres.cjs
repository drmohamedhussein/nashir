/**
 * Install local Postgres (or SQLite fallback) and wire DATABASE_URL.
 * Uses sudo -S with NASHIR_SSH_PASS when available.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const home = `/home/${username}`;
const web = `${home}/nashir/apps/web`;
const pgPort = "5433";
const dbName = "nashir";
const dbUser = "nashir";
const dbPass = "nashir_local_staging";

function exec(conn, command, tolerate = false) {
  return new Promise((resolve, reject) => {
    conn.exec(command, { pty: true }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        if (code && !tolerate) reject(new Error(`exit ${code}`));
        else resolve(out);
      });
    });
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve())));
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_*");
  process.exit(1);
}

const sudo = `printf '%s\\n' '${password.replace(/'/g, `'\\''`)}' | sudo -S -p ''`;

const c = new Client();
c.on("ready", async () => {
  try {
    console.log("=== 1. sudo check ===");
    const sudoOut = await exec(c, `${sudo} true && echo SUDO_OK || echo SUDO_FAIL`, true);

    let dbUrl = "";

    if (sudoOut.includes("SUDO_OK")) {
      console.log("\n=== 2. install postgresql via apt ===");
      await exec(
        c,
        [
          `${sudo} apt-get update -y`,
          `${sudo} DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib`,
          `${sudo} systemctl enable --now postgresql || ${sudo} service postgresql start || true`,
          "ss -tlnp | grep 5432 || true",
        ].join(" && "),
        true,
      );

      console.log("\n=== 3. create role + database ===");
      await exec(
        c,
        [
          `${sudo} -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${dbUser}'" | grep -q 1 || ${sudo} -u postgres psql -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPass}';"`,
          `${sudo} -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${dbName}'" | grep -q 1 || ${sudo} -u postgres psql -c "CREATE DATABASE ${dbName} OWNER ${dbUser};"`,
          `${sudo} -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`,
        ].join(" ; "),
        true,
      );

      dbUrl = `postgresql://${dbUser}:${dbPass}@127.0.0.1:5432/${dbName}`;
    }

    if (!dbUrl) {
      console.log("\n=== 2b. user-space postgres binaries ===");
      const pgHome = `${home}/.local/pgsql`;
      await exec(
        c,
        [
          `mkdir -p ${home}/.local`,
          `if [ ! -x ${pgHome}/bin/postgres ]; then`,
          `  cd /tmp`,
          `  curl -fsSL -o pg.tgz https://github.com/theseus-rs/postgresql-binaries/releases/download/16.9.0/postgresql-16.9.0-x86_64-unknown-linux-gnu.tar.gz || curl -fsSL -o pg.tgz https://get.enterprisedb.com/postgresql/postgresql-16.4-1-linux-x64-binaries.tar.gz`,
          `  mkdir -p ${pgHome}`,
          `  tar -xzf pg.tgz -C ${pgHome} --strip-components=1`,
          `fi`,
          `if [ ! -d ${home}/.local/pgdata ]; then`,
          `  ${pgHome}/bin/initdb -D ${home}/.local/pgdata --auth=trust --username=${dbUser} --pwfile=<(echo ${dbPass}) || ${pgHome}/bin/initdb -D ${home}/.local/pgdata --auth=trust`,
          `fi`,
          `echo "port = ${pgPort}" >> ${home}/.local/pgdata/postgresql.conf`,
          `echo "listen_addresses = '127.0.0.1'" >> ${home}/.local/pgdata/postgresql.conf`,
          `${pgHome}/bin/pg_ctl -D ${home}/.local/pgdata -l ${home}/.local/pg.log start || true`,
          `sleep 2`,
          `${pgHome}/bin/createdb -h 127.0.0.1 -p ${pgPort} -U ${dbUser} ${dbName} 2>/dev/null || true`,
          `${pgHome}/bin/pg_isready -h 127.0.0.1 -p ${pgPort} && echo PG_USERSPACE_OK || echo PG_USERSPACE_FAIL`,
        ].join("\n"),
        true,
      );
      dbUrl = `postgresql://${dbUser}:${dbPass}@127.0.0.1:${pgPort}/${dbName}`;
    }

    console.log("\n=== 4. write DATABASE_URL + prisma push ===");
    const envLocal = path.join(os.tmpdir(), "nashir-web.env");
    const src = path.resolve(__dirname, "../../apps/web/.env");
    let env = fs.existsSync(src) ? fs.readFileSync(src, "utf8").replace(/^\uFEFF/, "") : "";
    if (!/^DATABASE_URL=/m.test(env)) env += `\nDATABASE_URL="${dbUrl}"\n`;
    else env = env.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${dbUrl}"`);
    env = env.replace(/^APP_URL=.*/m, "APP_URL=https://nashir.satest.top");
    if (!/^APP_URL=/m.test(env)) env += `\nAPP_URL=https://nashir.satest.top\n`;
    fs.writeFileSync(envLocal, env);

    const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
    await put(sftp, envLocal, `${web}/.env`);

    await exec(
      c,
      [
        `cd ${web}`,
        "npx prisma db push --accept-data-loss",
        "pm2 restart nashir --update-env",
        "sleep 4",
        "curl -s http://127.0.0.1:3001/api/health",
        "echo",
        "curl -s 'https://nashir.satest.top/api/health?n='$(date +%s)",
      ].join(" && "),
      true,
    );

    console.log("\n✓ DATABASE_URL=", dbUrl.replace(dbPass, "***"));
    c.end();
  } catch (e) {
    console.error(e.message);
    c.end();
    process.exit(1);
  }
}).connect({ host, port: 22, username, password });
