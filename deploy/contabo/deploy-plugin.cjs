/**
 * Upload Nashir plugin folder + theme + downloadable zip via SFTP.
 * Env: NASHIR_SSH_HOST, NASHIR_SSH_USER, NASHIR_SSH_PASS
 */
const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const localTheme = path.join(__dirname, "..", "..", "apps", "wp-theme");
const localPlugin = path.join(__dirname, "..", "..", "apps", "plugin");
const localZip = path.join(__dirname, "..", "..", "apps", "web", "public", "downloads", "nashir.zip");

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".") || name.endsWith(".keep")) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (errOut += d.toString()));
      stream.on("close", (code) => {
        process.stdout.write(out);
        if (errOut) process.stderr.write(errOut);
        if (code) reject(new Error(`exit ${code}: ${command}\n${errOut}`));
        else resolve(out);
      });
    });
  });
}

function mkdirp(sftp, dir) {
  const parts = dir.replace(/\\/g, "/").split("/").filter(Boolean);
  let acc = "";
  return parts.reduce(async (prev, part) => {
    await prev;
    acc += "/" + part;
    await new Promise((resolve) => {
      sftp.mkdir(acc, { mode: 0o755 }, () => resolve());
    });
  }, Promise.resolve());
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

async function uploadDir(sftp, localDir, remoteDir) {
  await mkdirp(sftp, remoteDir);
  for (const file of walk(localDir)) {
    const rel = path.relative(localDir, file).replace(/\\/g, "/");
    const remote = `${remoteDir}/${rel}`;
    const parent = remote.slice(0, remote.lastIndexOf("/"));
    await mkdirp(sftp, parent);
    try {
      await put(sftp, file, remote);
      console.log("put", remote.replace(remoteRoot + "/", ""));
    } catch (error) {
      error.message = `put failed ${remote}: ${error.message}`;
      throw error;
    }
  }
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
      await uploadDir(sftp, localTheme, `${remoteRoot}/wp-content/themes/nashir`);
      await uploadDir(sftp, localPlugin, `${remoteRoot}/wp-content/plugins/nashir`);
      await mkdirp(sftp, `${remoteRoot}/wp-content/uploads/nashir`);
      if (fs.existsSync(localZip)) {
        await put(sftp, localZip, `${remoteRoot}/wp-content/uploads/nashir/nashir.zip`);
        console.log("put plugin zip");
      }
      const wp = `cd ${remoteRoot} && wp`;
      await exec(conn, `${wp} plugin activate nashir`);
      await exec(conn, `${wp} eval 'update_option("nashir_app_url",""); echo "app_url_cleared";'`);
      await exec(conn, `${wp} cache flush || true`);
      await exec(conn, `${wp} litespeed-purge all || true`);
      await exec(conn, `${wp} plugin list --name=nashir --fields=name,status,version`);
      console.log("done");
      conn.end();
    } catch (error) {
      console.error(error);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 30000 });
