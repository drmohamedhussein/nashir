/**
 * Upload Nashir theme + plugin zip and configure WordPress via WP-CLI.
 * Credentials come from env: NASHIR_SSH_HOST, NASHIR_SSH_USER, NASHIR_SSH_PASS
 */
const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const localTheme = path.join(__dirname, "..", "..", "apps", "wp-theme");
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
  return new Promise((resolve) => {
    sftp.mkdir(dir, { mode: 0o755 }, () => resolve());
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      await mkdirp(sftp, `${remoteRoot}/wp-content/themes/nashir`);
      await mkdirp(sftp, `${remoteRoot}/wp-content/uploads/nashir`);
      for (const file of walk(localTheme)) {
        const rel = path.relative(localTheme, file).replace(/\\/g, "/");
        const remote = `${remoteRoot}/wp-content/themes/nashir/${rel}`;
        const parent = remote.slice(0, remote.lastIndexOf("/"));
        await mkdirp(sftp, parent);
        await put(sftp, file, remote);
        console.log("put", rel);
      }
      if (fs.existsSync(localZip)) {
        await put(sftp, localZip, `${remoteRoot}/wp-content/uploads/nashir/nashir.zip`);
        console.log("put legacy plugin zip");
      } else {
        console.log("skip legacy nashir.zip (use rankpublish.zip)");
      }

      const wp = `cd ${remoteRoot} && wp --skip-plugins --skip-themes`;
      await exec(conn, `${wp} theme activate nashir`);
      await exec(conn, `${wp} language core install en_US ar || true`);
      await exec(conn, `${wp} site switch-language en_US || true`);
      await exec(conn, `${wp} option update blogname "RankPublish"`);
      await exec(conn, `${wp} option update blogdescription "Editorial calendar and publishing for WordPress"`);
      await exec(conn, `${wp} option update timezone_string "Asia/Riyadh"`);
      await exec(conn, `${wp} rewrite structure "/%postname%/"`);
      await exec(conn, `${wp} rewrite flush`);

      const pages = [
        ["home", "Home"],
        ["pricing", "Pricing"],
        ["download", "Download plugin"],
        ["privacy", "Privacy"],
        ["terms", "Terms"],
        ["features", "Features"],
        ["calendar", "Editorial calendar"],
        ["scheduling", "Scheduling"],
        ["social", "Social sharing"],
        ["guide", "Getting started"],
        ["faq", "FAQ"],
        ["about", "About RankPublish"],
        ["changelog", "Changelog"],
        ["contact", "Contact"],
        ["blog", "Blog"],
      ];
      for (const [slug, title] of pages) {
        await exec(
          conn,
          `EXISTING=$(${wp} post list --post_type=page --name=${slug} --format=ids); if [ -z "$EXISTING" ]; then ${wp} post create --post_type=page --post_status=publish --post_name=${slug} --post_title=${JSON.stringify(title)}; fi`,
        );
      }
      const homeId = (await exec(conn, `${wp} post list --post_type=page --name=home --field=ID`)).trim().split(/\s+/)[0];
      const blogId = (await exec(conn, `${wp} post list --post_type=page --name=blog --field=ID`)).trim().split(/\s+/)[0];
      await exec(conn, `${wp} option update show_on_front page`);
      await exec(conn, `${wp} option update page_on_front ${homeId}`);
      await exec(conn, `${wp} option update page_for_posts ${blogId}`);
      await exec(conn, `${wp} option update blogdescription "Editorial calendar, scheduling, and social sharing for WordPress"`);
      await exec(conn, `${wp} post list --post_type=post --name=hello-world --field=ID`).then(async (ids) => {
        const clean = ids.trim();
        if (clean) await exec(conn, `${wp} post delete ${clean} --force || true`);
      });

      const posts = [
        [
          "keep-wordpress-on-time",
          "Keep WordPress publishing on time",
          "WordPress publish times depend on a site visit and WP-Cron. RankPublish runs the due job from the cloud first, and the site sends a heartbeat every minute so the post still goes out if the server sleeps.",
        ],
        [
          "editorial-calendar-for-teams",
          "An editorial calendar for teams, not only individuals",
          "Drag a post to another day from WordPress or from RankPublish. After sync the source is the same, and permissions follow WordPress roles.",
        ],
        [
          "share-from-one-account",
          "Share from one account, not keys on every server",
          "Facebook, X, LinkedIn, and other network secrets stay in RankPublish. Each connected site inherits channels and templates without distributing keys.",
        ],
      ];
      for (const [slug, title, content] of posts) {
        const body = JSON.stringify(content);
        const ttl = JSON.stringify(title);
        await exec(
          conn,
          `${wp} post list --post_type=post --name=${slug} --field=ID | grep -q . || ${wp} post create --post_type=post --post_status=publish --post_name=${slug} --post_title=${ttl} --post_content=${body}`,
        );
      }
      await exec(conn, `${wp} option update default_comment_status closed`);
      await exec(conn, `cd ${remoteRoot} && wp cache flush && (wp litespeed-purge all || true)`);
      await exec(conn, `${wp} post list --post_type=page --fields=ID,post_name,post_title`);
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
