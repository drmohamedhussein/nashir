/**
 * Remove OpenLiteSpeed [P] rewrite rules that 500 without an External App.
 * Restores .htaccess by stripping the RankPublish SaaS Proxy block.
 */
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const home = `/home/${username}`;
const htaccessPath = `${home}/nashirwp/public_html/.htaccess`;
const olsConf = `${home}/nashirwp/conf/openlitespeed`;

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
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}: ${out}`)) : resolve(out)));
    });
  });
}

function stripProxyBlock(text) {
  const begin = "# BEGIN RankPublish SaaS Proxy";
  const end = "# END RankPublish SaaS Proxy";
  const start = text.indexOf(begin);
  const finish = text.indexOf(end);
  if (start < 0 || finish < 0 || finish < start) {
    return { text, changed: false };
  }
  const after = finish + end.length;
  const next = text.slice(after).replace(/^\r?\n/, "");
  return { text: `${text.slice(0, start).replace(/\s+$/, "")}\n${next}`.replace(/^\n+/, ""), changed: true };
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const raw = await new Promise((resolve, reject) => {
        sftp.readFile(htaccessPath, "utf8", (e, data) => (e ? reject(e) : resolve(data.toString())));
      });
      const { text, changed } = stripProxyBlock(raw);
      if (changed) {
        await new Promise((resolve, reject) => sftp.writeFile(htaccessPath, text, (e) => (e ? reject(e) : resolve())));
        console.log("htaccess_block_removed");
      } else {
        console.log("htaccess_block_not_found");
      }

      const disabled = "# SaaS proxy disabled until OLS External App 127.0.0.1:3001 exists.\nRewriteEngine On\n";
      for (const target of [`${olsConf}/rewrites.conf`, `${olsConf}/rewrites/000-rankpublish-saas.conf`]) {
        await new Promise((resolve, reject) => sftp.writeFile(target, disabled, (e) => (e ? reject(e) : resolve())));
        console.log("Wrote disabled rewrite", target);
      }

      await exec(
        conn,
        [
          `cd ${home}/nashirwp/public_html && wp cache flush || true`,
          "echo ---sudo-reload---",
          "echo | sudo -n /usr/local/lsws/bin/lswsctrl reload 2>&1 | head -n 20 || true",
          "echo ---health---",
          "curl -sI https://nashir.satest.top/api/health | head -n 8",
          "echo ---login---",
          "curl -sI https://nashir.satest.top/login | head -n 8",
          "echo ---home---",
          "curl -sI https://nashir.satest.top/ | head -n 8",
        ].join(" ; "),
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
