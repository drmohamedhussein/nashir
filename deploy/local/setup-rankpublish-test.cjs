/**
 * Install RankPublish product plugin on rankpublish-test.local (product-only QA site).
 *
 * Usage: node deploy/local/setup-rankpublish-test.cjs
 * Optional env:
 *   RANKPUBLISH_SOURCE — path to rankpublish plugin folder (default: rankpublish Local site)
 *   RANKPUBLISH_TEST_PUBLIC — path to test site public folder
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const source =
  process.env.RANKPUBLISH_SOURCE ||
  "C:/Users/drmoh/Local Sites/rankpublish/app/public/wp-content/plugins/rankpublish";
const testPublic =
  process.env.RANKPUBLISH_TEST_PUBLIC ||
  "C:/Users/drmoh/Local Sites/rankpublish-test/app/public";
const dest = path.join(testPublic, "wp-content/plugins/rankpublish");

const envrcPath = path.join(path.dirname(testPublic), ".envrc");
const env = { ...process.env };

if (fs.existsSync(envrcPath)) {
  const pathParts = [];
  for (const line of fs.readFileSync(envrcPath, "utf8").split(/\r?\n/)) {
    const pathMatch = line.match(/^export PATH="([^"]*)"/);
    if (pathMatch) {
      pathParts.push(pathMatch[1].replace(/\//g, path.sep));
      continue;
    }
    const m = line.match(/^export\s+(\w+)="([^"]*)"/);
    if (m) {
      env[m[1]] = m[2].replace(/\//g, path.sep);
    }
  }
  if (pathParts.length) {
    env.PATH = [...pathParts, process.env.PATH].join(path.delimiter);
  }
}

if (!env.PHPRC) {
  console.error("PHPRC not set — open Local site shell once or set RANKPUBLISH_TEST_PUBLIC.");
  process.exit(1);
}

function runWp(args) {
  const wpBat = path.join(
    "C:/Program Files (x86)/Local/resources/extraResources/bin/wp-cli/win32",
    "wp.bat"
  );
  const quoted = (s) => (/\s/.test(s) ? `"${s}"` : s);
  const command = [quoted(wpBat), ...args.map(quoted), quoted(`--path=${testPublic}`)].join(" ");
  const r = spawnSync(command, { stdio: "inherit", windowsHide: true, shell: true, env });
  if (r.status) process.exit(r.status || 1);
}

if (!fs.existsSync(path.join(source, "rankpublish.php"))) {
  console.error("Source plugin missing:", source);
  process.exit(1);
}

console.log("Copying rankpublish → test site…");
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(source, dest, { recursive: true, filter: (src) => !src.includes("node_modules") });

console.log("Activating RankPublish…");
runWp(["plugin", "activate", "rankpublish"]);

console.log("\nPlugin status:");
runWp(["plugin", "list", "--fields=name,status,version"]);

console.log("\nRankPublish modules:");
runWp([
  "eval",
  'if (class_exists("RankPublish\\Plugin")) { $p = RankPublish\\Plugin::instance(); echo "core_ok\\n"; } else { echo "missing\\n"; }',
]);

console.log("\nDone. Log in: http://rankpublish-test.local/wp-admin/ (Admin / Admin)");
