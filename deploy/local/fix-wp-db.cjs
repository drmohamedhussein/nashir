/**
 * Fix "Error establishing a database connection" on LocalWP sites.
 *
 * rankpublish-test.local must use its OWN WordPress DB (usually `local`),
 * NOT rankpublish_saas (that DB is for rankpublish.local + SaaS only).
 *
 * Usage (Windows, from repo root):
 *   node deploy/local/fix-wp-db.cjs --site rankpublish-test
 *   node deploy/local/fix-wp-db.cjs --site rankpublish
 *   node deploy/local/fix-wp-db.cjs --site rankpublish-test --dry-run
 */
const fs = require("fs");
const path = require("path");
const { DEFAULT_SITES, loadEnvrc, wp } = require("./lib/local-wp.cjs");

function parseArgs() {
  const args = process.argv.slice(2);
  let site = "rankpublish-test";
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--site" && args[i + 1]) {
      site = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }
  return { site, dryRun };
}

function siteRoot(publicPath) {
  return path.dirname(path.dirname(publicPath));
}

function readSiteJson(root) {
  const candidates = [
    path.join(root, "site.json"),
    path.join(root, "local-site.json"),
    path.join(root, "conf", "site.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      /* ignore */
    }
  }
  return null;
}

function mysqlPortFromSiteJson(json) {
  if (!json) return null;
  const services = json.services || json;
  const mysql = services.mysql || services.database;
  if (!mysql) return null;
  if (typeof mysql.port === "number") return mysql.port;
  if (typeof mysql.port === "string" && /^\d+$/.test(mysql.port)) return Number(mysql.port);
  return null;
}

function mysqlPortFromMyCnf(root) {
  const cnf = path.join(root, "conf", "mysql", "my.cnf");
  if (!fs.existsSync(cnf)) return null;
  const text = fs.readFileSync(cnf, "utf8");
  const match = text.match(/port\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function readWpConfigConstants(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`wp-config.php not found: ${configPath}`);
  }
  const text = fs.readFileSync(configPath, "utf8");
  const pick = (name) => {
    const m = text.match(new RegExp(`define\\s*\\(\\s*['"]${name}['"]\\s*,\\s*['"]([^'"]*)['"]`));
    return m ? m[1] : null;
  };
  return {
    text,
    DB_NAME: pick("DB_NAME"),
    DB_USER: pick("DB_USER"),
    DB_PASSWORD: pick("DB_PASSWORD"),
    DB_HOST: pick("DB_HOST"),
  };
}

function expectedDbName(siteKey) {
  if (siteKey === "rankpublish") {
    return process.env.RANKPUBLISH_WP_DB || "rankpublish_saas";
  }
  return process.env.RANKPUBLISH_TEST_WP_DB || "local";
}

function buildDbHost(port) {
  return `127.0.0.1:${port}`;
}

function patchWpConfig(text, { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST }) {
  let out = text;
  const replace = (name, value) => {
    const re = new RegExp(
      `(define\\s*\\(\\s*['"]${name}['"]\\s*,\\s*['"])([^'"]*)(['"]\\s*\\))`,
      "g"
    );
    if (!re.test(out)) {
      throw new Error(`Could not find define('${name}', ...) in wp-config.php`);
    }
    out = out.replace(re, `$1${value}$3`);
  };
  replace("DB_NAME", DB_NAME);
  replace("DB_USER", DB_USER);
  replace("DB_PASSWORD", DB_PASSWORD);
  replace("DB_HOST", DB_HOST);
  return out;
}

function printHelp(siteKey, root, port, current, expected) {
  console.log("\n--- Diagnosis ---");
  console.log("Site:", siteKey);
  console.log("Root:", root);
  console.log("MySQL port (Local):", port ?? "unknown — start site in Local app");
  console.log("Current wp-config:");
  console.log("  DB_NAME:", current.DB_NAME);
  console.log("  DB_USER:", current.DB_USER);
  console.log("  DB_HOST:", current.DB_HOST);
  console.log("Expected for this site:");
  console.log("  DB_NAME:", expected.DB_NAME);
  console.log("  DB_USER:", expected.DB_USER);
  console.log("  DB_HOST:", expected.DB_HOST);
  console.log("\nIf MySQL port is unknown:");
  console.log("  1. Open Local → select site → Start");
  console.log("  2. Site → Open site shell → re-run this script");
  console.log("\nCommon mistake: rankpublish-test must NOT use rankpublish_saas.");
  console.log("Only rankpublish.local shares rankpublish_saas (wp_* + rp_*).");
}

async function main() {
  const { site, dryRun } = parseArgs();
  const publicPath = DEFAULT_SITES[site];
  if (!publicPath || !fs.existsSync(publicPath)) {
    console.error(`Site folder not found: ${site}`);
    console.error("Expected:", publicPath);
    console.error("Create/start the site in Local first.");
    process.exit(1);
  }

  const root = siteRoot(publicPath);
  const configPath = path.join(publicPath, "wp-config.php");
  const current = readWpConfigConstants(configPath);
  const port = mysqlPortFromSiteJson(readSiteJson(root)) ?? mysqlPortFromMyCnf(root);

  const expected = {
    DB_NAME: expectedDbName(site),
    DB_USER: "root",
    DB_PASSWORD: "root",
    DB_HOST: port ? buildDbHost(port) : current.DB_HOST || "localhost",
  };

  printHelp(site, root, port, current, expected);

  const needsFix =
    current.DB_NAME !== expected.DB_NAME ||
    current.DB_USER !== expected.DB_USER ||
    current.DB_PASSWORD !== expected.DB_PASSWORD ||
    (port && current.DB_HOST !== expected.DB_HOST);

  if (!needsFix) {
    console.log("\n✓ wp-config.php already matches expected values.");
    if (!port) {
      console.log("⚠ MySQL port unknown — ensure the site is Running in Local.");
    } else {
      const { env, ok } = loadEnvrc(publicPath);
      if (ok) {
        try {
          wp(publicPath, ["db", "check"], env, true);
          console.log("✓ wp db check passed");
        } catch (e) {
          console.error("✗ wp db check failed:", e.message);
          console.error("→ Start the site in Local, then retry.");
          process.exit(1);
        }
      }
    }
    return;
  }

  if (!port) {
    console.error("\n✗ Cannot patch DB_HOST without MySQL port. Start site in Local first.");
    process.exit(1);
  }

  const patched = patchWpConfig(current.text, expected);
  const backup = `${configPath}.bak-${Date.now()}`;

  if (dryRun) {
    console.log("\n[dry-run] Would write:", expected);
    return;
  }

  fs.copyFileSync(configPath, backup);
  fs.writeFileSync(configPath, patched, "utf8");
  console.log("\n✓ Updated wp-config.php (backup:", backup, ")");

  const { env, ok } = loadEnvrc(publicPath);
  if (ok) {
    try {
      wp(publicPath, ["db", "check"], env, true);
      console.log("✓ wp db check passed — reload https://" + site + ".local/");
    } catch (e) {
      console.error("✗ wp db check still failing:", e.message);
      console.error("→ In Local: Stop site → Start site → Database → ensure database exists");
      process.exit(1);
    }
  } else {
    console.log("Open Local site shell and run: wp db check --path=" + publicPath);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
