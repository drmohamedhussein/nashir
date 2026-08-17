/**
 * Audit all four upstream plugins on staging vs rankpublish/modules/*.
 *
 * Env: NASHIR_SSH_HOST, NASHIR_SSH_USER, NASHIR_SSH_PASS
 * Optional: RANKPUBLISH_PLUGINS_DIR, RANKPUBLISH_PRODUCT_DIR
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

const pluginsDir =
  process.env.RANKPUBLISH_PLUGINS_DIR ||
  "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins";
const productDir = path.join(pluginsDir, "rankpublish");
const modulesConfigPath = path.join(pluginsDir, "rankpublish-site/data/modules.json");
const reportsDir = path.join(process.cwd(), "deploy/contabo/reports");

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}: ${command}`)) : resolve()));
    });
  });
}

function getRemote(sftp, remote, local) {
  return new Promise((resolve, reject) => {
    sftp.fastGet(remote, local, (err) => (err ? reject(err) : resolve()));
  });
}

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function listFiles(root) {
  const out = new Map();
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (fs.statSync(full).isDirectory()) walk(full);
      else out.set(rel, full);
    }
  }
  walk(root);
  return out;
}

function shouldSkip(rel, module) {
  const skip = [...(module.skip_paths || []), module.upstream_entry, "ATTRIBUTION.md"];
  const hooks = module.embed_hooks || [];
  if (hooks.includes(rel)) return "hook";
  for (const frag of skip) {
    if (frag && rel.includes(frag)) return "skip";
  }
  return false;
}

function compareModule(stagingRoot, mergedRoot, module) {
  if (!fs.existsSync(stagingRoot)) {
    return { status: "missing_upstream", message: "Not on staging" };
  }
  if (!fs.existsSync(mergedRoot)) {
    return { status: "missing_merged", message: "Merged module not found locally" };
  }

  const upstream = listFiles(stagingRoot);
  const merged = listFiles(mergedRoot);
  const keys = [...new Set([...upstream.keys(), ...merged.keys()])].sort();

  const same = [];
  const expectedDiff = [];
  const unexpected = [];
  let addedMerged = 0;
  let removedMerged = 0;

  for (const rel of keys) {
    const skip = shouldSkip(rel, module);
    if (skip === "skip") continue;

    const u = upstream.get(rel);
    const m = merged.get(rel);
    if (u && !m) {
      removedMerged++;
      continue;
    }
    if (!u && m) {
      addedMerged++;
      continue;
    }
    if (!u || !m) continue;

    if (hashFile(u) === hashFile(m)) {
      same.push(rel);
      continue;
    }
    if (skip === "hook") expectedDiff.push(rel);
    else unexpected.push(rel);
  }

  let status = "ok";
  if (unexpected.length) status = "action";
  else if (expectedDiff.length) status = "ok_hooks";

  return {
    status,
    summary: {
      same: same.length,
      expected_diff: expectedDiff.length,
      unexpected: unexpected.length,
      added_merged: addedMerged,
      removed_merged: removedMerged,
    },
    expected_diff: expectedDiff,
    unexpected,
  };
}

function readVersion(mainFile) {
  if (!fs.existsSync(mainFile)) return "?";
  const m = fs.readFileSync(mainFile, "utf8").match(/Version:\s*([^\n]+)/);
  return m ? m[1].trim() : "?";
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

const modules = JSON.parse(fs.readFileSync(modulesConfigPath, "utf8"));
const tmpBase = path.join(os.tmpdir(), "rankpublish-audit-all");
if (fs.existsSync(tmpBase)) fs.rmSync(tmpBase, { recursive: true, force: true });
fs.mkdirSync(tmpBase, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => (e ? reject(e) : resolve(s))));
      const report = { auditedAt: new Date().toISOString(), modules: {} };

      for (const module of modules) {
        const slug = module.slug;
        const archive = path.join(tmpBase, `${slug}.tgz`);
        const extract = path.join(tmpBase, slug);

        console.log(`\n=== ${module.label} (${slug}) ===`);

        try {
          await exec(conn, `cd ${remoteRoot}/wp-content/plugins && test -d ${slug} && tar -czf /tmp/rp-audit-${slug}.tgz ${slug}`);
          await getRemote(sftp, `/tmp/rp-audit-${slug}.tgz`, archive);
          fs.mkdirSync(extract, { recursive: true });
          const unpack = spawnSync("tar", ["-xzf", archive, "-C", extract], { stdio: "inherit", windowsHide: true });
          if (unpack.status) throw new Error("tar extract failed");

          const stagingRoot = path.join(extract, slug);
          const mergedRoot = path.join(productDir, "modules", module.id);
          const upstreamMain = path.join(stagingRoot, module.upstream_entry);

          const cmp = compareModule(stagingRoot, mergedRoot, module);
          report.modules[module.id] = {
            label: module.label,
            basename: module.basename,
            stagingVersion: readVersion(upstreamMain),
            mergedPath: path.relative(pluginsDir, mergedRoot).replace(/\\/g, "/"),
            ...cmp,
          };

          console.log(JSON.stringify(cmp.summary || cmp, null, 2));
        } catch (err) {
          console.error(`Skip ${slug}:`, err.message);
          report.modules[module.id] = {
            label: module.label,
            status: "error",
            message: err.message,
          };
        }
      }

      const outFile = path.join(reportsDir, "audit-staging-all.json");
      fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
      console.log("\nWrote", outFile);
      conn.end();
    } catch (e) {
      console.error(e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host, port: 22, username, password, readyTimeout: 180000 });
