/**
 * Pack the customer RankPublish plugin from rankpublish-test.local
 * using Windows PHP ZipArchive (WordPress-compatible PKZIP).
 *
 * Usage: node deploy/local/pack-rankpublish-product.cjs [out.zip]
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const pluginDir =
  process.env.RANKPUBLISH_PLUGIN_DIR ||
  "C:/Users/drmoh/Local Sites/rankpublish-test/app/public/wp-content/plugins/rankpublish";
const phpExe =
  process.env.RANKPUBLISH_PHP ||
  "C:/Users/drmoh/AppData/Roaming/Local/lightning-services/php-8.2.30+1/bin/win64/php.exe";
const phpRc =
  process.env.PHPRC ||
  "C:/Users/drmoh/AppData/Roaming/Local/run/DAncstjil/conf/php";
const packer = path.join(__dirname, "pack-rankpublish-product.php");
const primaryOut =
  process.argv[2] || path.join(repoRoot, "dist", "rankpublish.zip");

const copies = [
  path.join(repoRoot, "apps", "web", "public", "downloads", "rankpublish.zip"),
  "C:/Users/drmoh/Local Sites/rankpublish-test/app/public/wp-content/uploads/rankpublish/rankpublish.zip",
];

function mustExist(file, label) {
  if (!fs.existsSync(file)) {
    console.error("Missing", label, file);
    process.exit(1);
  }
}

mustExist(path.join(pluginDir, "rankpublish.php"), "plugin bootstrap");
mustExist(path.join(pluginDir, "modules"), "merged modules");
mustExist(path.join(pluginDir, "assets", "cloud-connect.css"), "Cloud Connect CSS");
mustExist(path.join(pluginDir, "assets", "admin-menu.css"), "admin menu icon CSS");
mustExist(path.join(pluginDir, "assets", "logo-menu.svg"), "20x20 RP menu mark");
mustExist(path.join(pluginDir, "includes", "connector", "class-admin.php"), "Cloud Connect admin");
mustExist(phpExe, "Local PHP");
mustExist(packer, "packer script");

const adminPhp = fs.readFileSync(path.join(pluginDir, "includes", "connector", "class-admin.php"), "utf8");
if (adminPhp.includes("Integrations on this site")) {
  console.error("Plugin still lists Integrations on Cloud Connect — aborting pack.");
  process.exit(1);
}
if (!adminPhp.includes("cloud-connect.css")) {
  console.error("Plugin is missing Cloud Connect wizard assets — aborting pack.");
  process.exit(1);
}
if (!adminPhp.includes("admin-menu.css")) {
  console.error("Plugin is missing admin menu icon CSS — aborting pack.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(primaryOut), { recursive: true });

const pack = spawnSync(phpExe, [packer, pluginDir, primaryOut], {
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, PHPRC: phpRc },
});
if (pack.status !== 0) {
  process.exit(pack.status || 1);
}

const buf = fs.readFileSync(primaryOut);
if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
  console.error("Output is not a PKZIP (Windows/WordPress zip).");
  process.exit(1);
}
console.log("Verified PKZIP header (PK) — WordPress uploader compatible");

for (const dest of copies) {
  if (path.resolve(dest) === path.resolve(primaryOut)) {
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(primaryOut, dest);
  console.log("Copied", dest);
}

console.log("Customer zip ready:", primaryOut);
