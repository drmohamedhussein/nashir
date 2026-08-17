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
      await put(sftp, localZip, `${remoteRoot}/wp-content/uploads/nashir/nashir.zip`);
      console.log("put plugin zip");

      const wp = `cd ${remoteRoot} && wp --skip-plugins --skip-themes`;
      await exec(conn, `${wp} theme activate nashir`);
      await exec(conn, `${wp} language core install ar || true`);
      await exec(conn, `${wp} site switch-language ar || true`);
      await exec(conn, `${wp} option update blogname "ناشر"`);
      await exec(conn, `${wp} option update blogdescription "تقويم تحريري سحابي لمواقع ووردبريس"`);
      await exec(conn, `${wp} option update timezone_string "Asia/Riyadh"`);
      await exec(conn, `${wp} rewrite structure "/%postname%/"`);
      await exec(conn, `${wp} rewrite flush`);

      const pages = [
        ["home", "الرئيسية"],
        ["pricing", "التسعير"],
        ["download", "تنزيل الإضافة"],
        ["privacy", "الخصوصية"],
        ["terms", "الشروط"],
        ["features", "المزايا"],
        ["calendar", "التقويم التحريري"],
        ["scheduling", "الجدولة"],
        ["social", "المشاركة الاجتماعية"],
        ["guide", "دليل البدء"],
        ["faq", "أسئلة شائعة"],
        ["about", "عن ناشر"],
        ["changelog", "سجل الإصدارات"],
        ["contact", "تواصل"],
        ["blog", "المدونة"],
      ];
      for (const [slug, title] of pages) {
        await exec(
          conn,
          `${wp} post list --post_type=page --name=${slug} --field=ID | grep -q . || ${wp} post create --post_type=page --post_status=publish --post_name=${slug} --post_title=${JSON.stringify(title)}`,
        );
      }
      const homeId = (await exec(conn, `${wp} post list --post_type=page --name=home --field=ID`)).trim().split(/\s+/)[0];
      const blogId = (await exec(conn, `${wp} post list --post_type=page --name=blog --field=ID`)).trim().split(/\s+/)[0];
      await exec(conn, `${wp} option update show_on_front page`);
      await exec(conn, `${wp} option update page_on_front ${homeId}`);
      await exec(conn, `${wp} option update page_for_posts ${blogId}`);
      await exec(conn, `${wp} option update blogdescription "تقويم تحريري وجدولة ومشاركة اجتماعية لووردبريس"`);
      await exec(conn, `${wp} post list --post_type=post --name=hello-world --field=ID`).then(async (ids) => {
        const clean = ids.trim();
        if (clean) await exec(conn, `${wp} post delete ${clean} --force || true`);
      });

      const posts = [
        [
          "keep-wordpress-on-time",
          "كيف تُبقي ووردبريس ينشر في موعده",
          "الموعد في ووردبريس يعتمد على زيارة الموقع وWP-Cron. ناشر يعالج الموعد من السحابة أولاً، والموقع يرسل نبضة كل دقيقة حتى لا يضيع المقال إن نام السيرفر.",
        ],
        [
          "editorial-calendar-for-teams",
          "تقويم تحريري للفرق لا للأفراد فقط",
          "اسحب المقال إلى يوم آخر من ووردبريس أو من حساب ناشر. المصدر واحد بعد المزامنة، والصلاحيات تتبع أدوار ووردبريس.",
        ],
        [
          "share-from-one-account",
          "شارك من حساب واحد لا من مفاتيح على كل سيرفر",
          "أسرار فيسبوك وX ولينكدإن وباقي المنصات تُحفظ في ناشر. كل موقع مربوط يرث القنوات والقوالب دون توزيع المفاتيح.",
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
