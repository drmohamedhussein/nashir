#!/usr/bin/env node
/**
 * Sync RankPublish design system from upstream repo into apps/web.
 * Source: https://github.com/drmohamedhussein/rankpublish
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const WEB = path.join(ROOT, "apps/web");
const CACHE = path.join(ROOT, ".cache/rankpublish-design");
const REPO = process.env.RANKPUBLISH_DESIGN_REPO ?? "https://github.com/drmohamedhussein/rankpublish.git";

function run(cmd, cwd = ROOT) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

if (!fs.existsSync(CACHE)) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  run(`git clone --depth 1 ${REPO} "${CACHE}"`);
} else {
  run("git pull --ff-only", CACHE);
}

const designCss = path.join(CACHE, "client/src/index.css");
const targetCss = path.join(WEB, "design/rankpublish/index.css");
fs.mkdirSync(path.dirname(targetCss), { recursive: true });
fs.copyFileSync(designCss, targetCss);

const manifest = {
  source: REPO,
  syncedAt: new Date().toISOString(),
  notes: "Tokens live in apps/web/src/app/globals.css; full upstream CSS kept as reference.",
};
fs.writeFileSync(path.join(WEB, "design/rankpublish/manifest.json"), JSON.stringify(manifest, null, 2));

console.log("RankPublish design reference synced to apps/web/design/rankpublish/");
