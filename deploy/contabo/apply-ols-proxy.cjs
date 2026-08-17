const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const user = process.env.NASHIR_SSH_USER;
const olsConf = `/home/${user}/nashirwp/conf/openlitespeed`;
const rewriteContent = fs.readFileSync(path.join(__dirname, "openlitespeed-saas-rewrite.conf"), "utf8");
const port = process.env.NASHIR_APP_PORT || "3001";

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

const c = new Client();
c.on("ready", async () => {
  const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => (e ? reject(e) : resolve(s))));
  for (const target of [
    `${olsConf}/rewrites.conf`,
    `${olsConf}/rewrites/000-rankpublish-saas.conf`,
  ]) {
    await new Promise((res, rej) => sftp.writeFile(target, rewriteContent, (e) => (e ? rej(e) : res())));
    console.log("Wrote", target);
  }

  // LiteSpeed doc: direct 127.0.0.1:port without external app
  const htaccess = `# BEGIN RankPublish SaaS Proxy
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^(app|api|login|register|privacy|terms|sitemap\\.xml)(/.*)?$ http://127.0.0.1:${port}/$1$2 [P,L,E=Proxy-Host:nashir.satest.top]
RewriteRule ^_next/(.*)$ http://127.0.0.1:${port}/_next/$1 [P,L,E=Proxy-Host:nashir.satest.top]
</IfModule>
# END RankPublish SaaS Proxy
`;
  await new Promise((res, rej) =>
    sftp.writeFile(`/home/${user}/nashirwp/public_html/.htaccess.saas`, htaccess, (e) => (e ? rej(e) : res())),
  );

  await exec(
    c,
    `cd /home/${user}/nashirwp/public_html && python3 - <<'PY'
from pathlib import Path
p = Path('.htaccess')
text = p.read_text(encoding='utf-8')
block = Path('.htaccess.saas').read_text(encoding='utf-8')
if 'RankPublish SaaS Proxy' not in text:
    p.write_text(block + '\\n' + text, encoding='utf-8')
else:
    start = text.find('# BEGIN RankPublish SaaS Proxy')
    end = text.find('# END RankPublish SaaS Proxy') + len('# END RankPublish SaaS Proxy')
    p.write_text(block + '\\n' + text[end:].lstrip('\\n'), encoding='utf-8')
print('htaccess_patched')
PY`,
  );

  await exec(c, "curl -sI https://nashir.satest.top/api/health | head -5; curl -s https://nashir.satest.top/api/health 2>/dev/null | head -c 120");
  c.end();
}).connect({
  host: process.env.NASHIR_SSH_HOST,
  port: 22,
  username: user,
  password: process.env.NASHIR_SSH_PASS,
});
