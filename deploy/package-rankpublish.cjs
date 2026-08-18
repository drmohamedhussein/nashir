/**
 * Build distributable plugin ZIPs for RankPublish marketing + bridge.
 * Usage: node deploy/package-rankpublish.cjs
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "dist");
const sitePlugin = path.join(repoRoot, "apps/rankpublish-site");
const bridge = path.join(sitePlugin, "includes/bridge/rankpublish-bridge.php");
const connector = path.join(repoRoot, "apps/rankpublish");

fs.mkdirSync(outDir, { recursive: true });

function zipDir(source, destZip, label) {
  if (!fs.existsSync(source)) {
    console.warn(`Skip ${label}: missing ${source}`);
    return;
  }
  if (fs.existsSync(destZip)) {
    fs.rmSync(destZip);
  }
  execSync(`cd "${source}" && zip -r "${destZip}" . -x "node_modules/*" -x "*.git*"`, { stdio: "inherit" });
  console.log("✓", label, "→", destZip);
}

zipDir(sitePlugin, path.join(outDir, "rankpublish-site.zip"), "rankpublish-site");
zipDir(connector, path.join(outDir, "rankpublish-connector.zip"), "rankpublish-connector");

if (fs.existsSync(bridge)) {
  const bridgeDir = path.join(outDir, "rankpublish-bridge");
  fs.mkdirSync(bridgeDir, { recursive: true });
  fs.copyFileSync(bridge, path.join(bridgeDir, "rankpublish-bridge.php"));
  execSync(`cd "${bridgeDir}" && zip -r "${path.join(outDir, "rankpublish-bridge.zip")}" .`, { stdio: "inherit" });
  fs.rmSync(bridgeDir, { recursive: true, force: true });
  console.log("✓ rankpublish-bridge →", path.join(outDir, "rankpublish-bridge.zip"));
}

console.log("\nArtifacts ready in", outDir);
