/**
 * Shared LocalWP + WP-CLI helpers for deploy/local scripts.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const WP_BAT = path.join(
  "C:/Program Files (x86)/Local/resources/extraResources/bin/wp-cli/win32",
  "wp.bat"
);

const DEFAULT_SITES = {
  rankpublish: "C:/Users/drmoh/Local Sites/rankpublish/app/public",
  "rankpublish-test": "C:/Users/drmoh/Local Sites/rankpublish-test/app/public",
};

const DEV_ACTIVE = [
  "rankpublish-site",
  "wp-scheduled-posts",
  "wp-scheduled-posts-pro",
  "thinkrank",
  "thinkrank-pro",
];

const PRODUCT_ACTIVE = ["rankpublish"];

const ALWAYS_OFF = {
  dev: ["rankpublish", "nashir"],
  product: [
    "rankpublish-site",
    "wp-scheduled-posts",
    "wp-scheduled-posts-pro",
    "thinkrank",
    "thinkrank-pro",
    "nashir",
  ],
};

function loadEnvrc(publicPath) {
  const envrcPath = path.join(path.dirname(publicPath), ".envrc");
  const env = { ...process.env };
  if (!fs.existsSync(envrcPath)) {
    return { env, envrcPath, ok: false };
  }
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
  // wp-cli on Windows invokes `php` from PATH; ensure Local's PHP dir is first.
  if (env.PHPRC) {
    const parts = (env.PATH || "").split(path.delimiter);
    const phpDir = parts.find(
      (p) => p.includes("lightning-services") && p.includes("php") && p.endsWith("win64")
    );
    if (phpDir) {
      env.PATH = [phpDir, ...parts.filter((p) => p !== phpDir)].join(path.delimiter);
    }
  }
  return { env, envrcPath, ok: Boolean(env.PHPRC) };
}

function stripWpOutput(output) {
  const lines = (output || "").split(/\r?\n/);
  const jsonStart = lines.findIndex((l) => /^[\[{]/.test(l.trim()));
  if (jsonStart >= 0) {
    return lines.slice(jsonStart).join("\n").trim();
  }
  return (output || "").replace(/^Warning:.*\n/gm, "").trim();
}

function wp(publicPath, args, env, capture = false) {
  const quoted = (s) => (/\s/.test(s) ? `"${s}"` : s);
  const command = [quoted(WP_BAT), ...args.map(quoted), quoted(`--path=${publicPath}`)].join(" ");
  const r = spawnSync(command, {
    encoding: "utf8",
    windowsHide: true,
    shell: true,
    env,
    stdio: capture ? "pipe" : "inherit",
  });
  if (r.status) {
    const err = (r.stderr || r.stdout || "").trim();
    throw new Error(err || `wp ${args.join(" ")} failed (${r.status})`);
  }
  return capture ? stripWpOutput(r.stdout || "") : "";
}

function pluginInstalled(publicPath, slug, env) {
  return fs.existsSync(path.join(publicPath, "wp-content/plugins", slug));
}

function resolveSite(siteArg) {
  const key = siteArg || process.env.RANKPUBLISH_LOCAL_SITE || "rankpublish";
  const publicPath = process.env.RANKPUBLISH_PUBLIC || DEFAULT_SITES[key];
  if (!publicPath || !fs.existsSync(publicPath)) {
    throw new Error(`Site not found: ${key}`);
  }
  return { key, publicPath };
}

function syncRankpublish(sourcePublic, destPublic) {
  const source = path.join(sourcePublic, "wp-content/plugins/rankpublish");
  const dest = path.join(destPublic, "wp-content/plugins/rankpublish");
  if (!fs.existsSync(path.join(source, "rankpublish.php"))) {
    throw new Error(`Source rankpublish missing: ${source}`);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => !src.includes("node_modules"),
  });
}

function detectMode(publicPath, env) {
  const out = wp(
    publicPath,
    ["plugin", "list", "--fields=name,status", "--format=json"],
    env,
    true
  );
  const list = JSON.parse(out || "[]");
  const active = new Set(list.filter((p) => p.status === "active").map((p) => p.name));

  const productOn = PRODUCT_ACTIVE.every((s) => active.has(s));
  const devCoreOn = DEV_ACTIVE.every((s) => active.has(s));
  const upstreamOff = !["wp-scheduled-posts", "thinkrank"].some((s) => active.has(s));

  if (productOn && upstreamOff && !active.has("rankpublish-site")) {
    return "product";
  }
  if (devCoreOn && !active.has("rankpublish")) {
    return "dev";
  }
  return "mixed";
}

module.exports = {
  WP_BAT,
  DEFAULT_SITES,
  DEV_ACTIVE,
  PRODUCT_ACTIVE,
  ALWAYS_OFF,
  loadEnvrc,
  wp,
  pluginInstalled,
  resolveSite,
  syncRankpublish,
  detectMode,
};
