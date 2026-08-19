/**
 * Recover LocalWP site from HTTP 500 / failed WP update.
 *
 * Usage:
 *   node deploy/local/recover-local-wp.cjs --site rankpublish
 *   node deploy/local/recover-local-wp.cjs --site rankpublish --disable-rpsite
 *   node deploy/local/recover-local-wp.cjs --site rankpublish --fix-imagick
 *   node deploy/local/recover-local-wp.cjs --site rankpublish --all
 */
const fs = require("fs");
const path = require("path");
const { loadEnvrc, wp, resolveSite } = require("./lib/local-wp.cjs");

const siteArg = process.argv.find((a, i) => process.argv[i - 1] === "--site");
const disableRpsite = process.argv.includes("--disable-rpsite");
const enableRpsite = process.argv.includes("--enable-rpsite");
const fixImagick = process.argv.includes("--fix-imagick");
const runAll = process.argv.includes("--all");

const { key, publicPath } = resolveSite(siteArg || "rankpublish");
const siteRoot = path.dirname(path.dirname(publicPath));
const pluginDir = path.join(publicPath, "wp-content/plugins/rankpublish-site");
const pluginOff = pluginDir + ".off";

function log(title, detail = "") {
  console.log(`${title}${detail ? ` — ${detail}` : ""}`);
}

function tailFile(label, filePath, lines = 40) {
  if (!fs.existsSync(filePath)) {
    log(label, "not found: " + filePath);
    return;
  }
  const body = fs.readFileSync(filePath, "utf8").split(/\r?\n/).slice(-lines);
  console.log(`\n--- ${label} (last ${lines} lines) ---`);
  console.log(body.join("\n"));
  console.log("--- end log ---\n");
}

function tailErrorLog() {
  tailFile("PHP error log", path.join(siteRoot, "logs", "php", "error.log"));
  tailFile("WordPress debug.log", path.join(publicPath, "wp-content", "debug.log"));
}

function removeMaintenanceMode() {
  const maintenance = path.join(publicPath, ".maintenance");
  if (!fs.existsSync(maintenance)) {
    return;
  }
  fs.rmSync(maintenance, { force: true });
  log("maintenance", "removed .maintenance (stuck WP update lock)");
}

function disablePluginFolder() {
  if (!fs.existsSync(pluginDir)) {
    if (fs.existsSync(pluginOff)) {
      log("rankpublish-site", "already disabled (.off)");
      return;
    }
    log("rankpublish-site", "plugin folder not found");
    return;
  }
  fs.renameSync(pluginDir, pluginOff);
  log("rankpublish-site", "DISABLED (renamed to rankpublish-site.off)");
}

function enablePluginFolder() {
  if (!fs.existsSync(pluginOff)) {
    log("rankpublish-site", "nothing to re-enable (.off missing)");
    return;
  }
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }
  fs.renameSync(pluginOff, pluginDir);
  log("rankpublish-site", "ENABLED");
}

function commentImagickLines(text) {
  return text
    .replace(/^(\s*)extension\s*=\s*php_imagick(?:\.dll)?\s*$/gim, "$1; extension=php_imagick.dll")
    .replace(/^(\s*)extension\s*=\s*imagick(?:\.so|\.dll)?\s*$/gim, "$1; extension=imagick")
    .replace(/^(\s*)zend_extension\s*=\s*.*imagick.*$/gim, "$1; zend_extension=imagick (disabled)");
}

function resolvePhpIniCandidates(env, phpExe) {
  const candidates = [];
  const push = (p) => {
    if (!p || candidates.includes(p)) return;
    candidates.push(p);
  };

  push(path.join(siteRoot, "conf", "php", "php.ini"));
  push(path.join(siteRoot, "conf", "php", "php.ini.hbs"));

  if (phpExe) {
    const phpDir = path.dirname(phpExe);
    push(path.join(phpDir, "php.ini"));
    push(path.join(phpDir, "..", "php.ini"));
    push(path.join(phpDir, "..", "conf", "php.ini"));
  }

  const phpRc = env.PHPRC;
  if (phpRc) {
    try {
      if (fs.statSync(phpRc).isDirectory()) {
        push(path.join(phpRc, "php.ini"));
        push(path.join(phpRc, "php.ini.hbs"));
      } else {
        push(phpRc);
      }
    } catch {
      push(phpRc);
    }
  }

  const confPhp = path.join(siteRoot, "conf", "php");
  if (fs.existsSync(confPhp)) {
    for (const name of fs.readdirSync(confPhp)) {
      if (/\.ini(\.hbs)?$/i.test(name)) {
        push(path.join(confPhp, name));
      }
    }
  }

  return candidates.filter((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

function fixImagickIni() {
  const { env, phpExe } = loadEnvrc(publicPath);
  const candidates = resolvePhpIniCandidates(env, phpExe);

  let fixed = 0;
  for (const phpIni of candidates) {
    const before = fs.readFileSync(phpIni, "utf8");
    const after = commentImagickLines(before);
    if (after === before) {
      continue;
    }
    fs.writeFileSync(phpIni, after);
    log("fix-imagick", "commented imagick in " + phpIni);
    fixed++;
  }
  if (!fixed) {
    log("fix-imagick", "no imagick extension line found (checked " + candidates.join(", ") + ")");
    return;
  }
  log("fix-imagick", "restart site in Local (Stop → Start)");
}

function wpRecover(env) {
  try {
    wp(publicPath, ["plugin", "deactivate", "rankpublish-site"], env);
    log("WP-CLI", "deactivated rankpublish-site");
  } catch (e) {
    log("WP-CLI deactivate", e.message || String(e));
  }
  try {
    wp(publicPath, ["rewrite", "flush"], env);
    log("WP-CLI", "rewrite flushed");
  } catch (e) {
    log("WP-CLI rewrite", e.message || String(e));
  }
  try {
    wp(publicPath, ["core", "update-db"], env);
    log("WP-CLI", "core update-db OK");
  } catch (e) {
    log("WP-CLI update-db", e.message || String(e));
  }
}

console.log(`\nRecover LocalWP — ${key}\n${"=".repeat(40)}\n`);
removeMaintenanceMode();
tailErrorLog();

if (runAll || fixImagick) {
  fixImagickIni();
}

if (enableRpsite) {
  enablePluginFolder();
} else if (runAll || disableRpsite) {
  disablePluginFolder();
}

const { env, ok, phpExe } = loadEnvrc(publicPath);
if (ok && phpExe && (runAll || disableRpsite)) {
  wpRecover(env);
}

const adminUrl = `https://${key}.local/wp-admin/`;
console.log("\nNext:");
console.log("1. Local → Stop site → Start site");
console.log("2. Open " + adminUrl);
if (disableRpsite || runAll) {
  console.log("3. If site works: git pull && node deploy/local/sync-rankpublish-site.cjs --site " + key);
  console.log("4. Re-enable plugin: node deploy/local/recover-local-wp.cjs --site " + key + " --enable-rpsite");
}
console.log("");
