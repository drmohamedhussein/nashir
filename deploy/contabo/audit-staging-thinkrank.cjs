/**
 * Audit ThinkRank on staging vs local rankpublish/modules/seo merge baseline.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = "/home/7CvmqqaIv1y9ddCw/nashirwp/public_html";
const localThinkrank =
  process.env.LOCAL_THINKRANK ||
  "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/thinkrank";
const localMerged =
  process.env.LOCAL_MERGED_SEO ||
  "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/rankpublish/modules/seo";
const stagingArchive = path.join(os.tmpdir(), "thinkrank-staging-audit.tgz");
const extractDir = path.join(os.tmpdir(), "thinkrank-staging-audit");

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

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

function getRemote(sftp, remote, local) {
  return new Promise((resolve, reject) => {
    sftp.fastGet(remote, local, (err) => (err ? reject(err) : resolve()));
  });
}

function hashFile(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function listFiles(root) {
  const out = new Map();
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        out.set(rel, full);
      }
    }
  }
  walk(root);
  return out;
}

function compareTrees(stagingRoot, mergedRoot, localRoot) {
  const staging = listFiles(stagingRoot);
  const merged = listFiles(mergedRoot);
  const local = listFiles(localRoot);

  const skip = (rel) =>
    rel.endsWith(".keep") ||
    rel.includes("rankpublish-menu.svg") ||
    rel.includes("class-manager.php") && rel.includes("rankpublish-menu");

  const allKeys = new Set([...staging.keys(), ...merged.keys()]);
  const vsMerged = { added: [], removed: [], changed: [], same: [] };
  const vsLocal = { added: [], removed: [], changed: [], same: [] };

  for (const rel of [...allKeys].sort()) {
    if (skip(rel)) continue;
    const s = staging.get(rel);
    const m = merged.get(rel);
    const l = local.get(rel);

    if (s && !m) vsMerged.removed.push(rel);
    else if (!s && m) vsMerged.added.push(rel);
    else if (s && m) {
      const sh = hashFile(s);
      const mh = hashFile(m);
      if (sh === mh) vsMerged.same.push(rel);
      else vsMerged.changed.push({ rel, staging: sh.slice(0, 12), merged: mh.slice(0, 12) });
    }

    if (s && !l) vsLocal.added.push(rel);
    else if (!s && l) vsLocal.removed.push(rel);
    else if (s && l) {
      const sh = hashFile(s);
      const lh = hashFile(l);
      if (sh === lh) vsLocal.same.push(rel);
      else vsLocal.changed.push({ rel, staging: sh.slice(0, 12), local: lh.slice(0, 12) });
    }
  }

  return { vsMerged, vsLocal };
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
if (fs.existsSync(stagingArchive)) fs.unlinkSync(stagingArchive);

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const wp = `cd ${remoteRoot} && wp`;
      await exec(
        conn,
        [
          `${wp} plugin get thinkrank --field=version`,
          `${wp} plugin get thinkrank --field=name`,
          `${wp} plugin is-active thinkrank && echo active || echo inactive`,
          `grep -E '^ \\* Version:|THINKRANK_VERSION' ${remoteRoot}/wp-content/plugins/thinkrank/thinkrank.php | head -5`,
        ].join(" && echo '---' && ")
      );

      await exec(
        conn,
        `cd ${remoteRoot}/wp-content/plugins && tar -czf /tmp/thinkrank-staging-audit.tgz thinkrank`
      );

      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      await getRemote(sftp, "/tmp/thinkrank-staging-audit.tgz", stagingArchive);

      fs.mkdirSync(extractDir, { recursive: true });
      const unpack = spawnSync("tar", ["-xzf", stagingArchive, "-C", extractDir], {
        stdio: "inherit",
        windowsHide: true,
      });
      if (unpack.status) process.exit(unpack.status);

      const stagingRoot = path.join(extractDir, "thinkrank");
      const report = compareTrees(stagingRoot, localMerged, localThinkrank);

      const outPath = path.join(
        process.cwd(),
        "deploy/contabo/reports/thinkrank-staging-audit.json"
      );
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          {
            auditedAt: new Date().toISOString(),
            stagingVersion: (() => {
              const php = fs.readFileSync(path.join(stagingRoot, "thinkrank.php"), "utf8");
              const m = php.match(/Version:\s*([^\n]+)/);
              return m ? m[1].trim() : "?";
            })(),
            mergedBaseline: "1.31.0",
            summary: {
              vsMerged: {
                added: report.vsMerged.added.length,
                removed: report.vsMerged.removed.length,
                changed: report.vsMerged.changed.length,
                same: report.vsMerged.same.length,
              },
              vsLocal: {
                added: report.vsLocal.added.length,
                removed: report.vsLocal.removed.length,
                changed: report.vsLocal.changed.length,
                same: report.vsLocal.same.length,
              },
            },
            changedVsMerged: report.vsMerged.changed,
            addedVsMerged: report.vsMerged.added,
            removedVsMerged: report.vsMerged.removed,
            changedVsLocal: report.vsLocal.changed,
          },
          null,
          2
        )
      );

      console.log("\n=== SUMMARY vs rankpublish/modules/seo ===");
      console.log(JSON.stringify(report.vsMerged.changed.length ? report.vsMerged : {
        added: report.vsMerged.added.length,
        removed: report.vsMerged.removed.length,
        changed: 0,
        same: report.vsMerged.same.length,
      }, null, 2));
      console.log("\nWrote", outPath);
      conn.end();
    } catch (e) {
      console.error(e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password, readyTimeout: 120000 });
