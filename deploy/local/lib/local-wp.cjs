/**
 * Fix LocalWP envrc discovery + invoke WP-CLI via explicit php.exe (avoids PATH issues in PowerShell).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const WP_BAT = path.join(
  "C:/Program Files (x86)/Local/resources/extraResources/bin/wp-cli/win32",
  "wp.bat"
);
const WP_PHAR = resolveWpPharPath();

function resolveWpPharPath() {
  const candidates = [
    path.join(
      process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
      "Local/resources/extraResources/bin/wp-cli/wp-cli.phar"
    ),
    path.join(
      process.env.LOCALAPPDATA || "",
      "Programs/Local/resources/extraResources/bin/wp-cli/wp-cli.phar"
    ),
    path.join(
      process.env.ProgramFiles || "C:/Program Files",
      "Local/resources/extraResources/bin/wp-cli/wp-cli.phar"
    ),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

const DEFAULT_SITES = {
  rankpublish: "C:/Users/drmoh/Local Sites/rankpublish/app/public",
  "rankpublish-test": "C:/Users/drmoh/Local Sites/rankpublish-test/app/public",
  "cloud-local": path.resolve(__dirname, "../../../.cloud-local-wp/public"),
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

function siteRootFromPublic(publicPath) {
  return path.dirname(path.dirname(publicPath));
}

function findEnvrc(publicPath) {
  const candidates = [
    path.join(siteRootFromPublic(publicPath), ".envrc"),
    path.join(path.dirname(publicPath), ".envrc"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function parseEnvrcFile(envrcPath, env) {
  const next = { ...env };
  const pathParts = [];
  for (const line of fs.readFileSync(envrcPath, "utf8").split(/\r?\n/)) {
    const pathMatch = line.match(/^export PATH="([^"]*)"/);
    if (pathMatch) {
      pathParts.push(pathMatch[1].replace(/\//g, path.sep));
      continue;
    }
    const m = line.match(/^export\s+(\w+)="([^"]*)"/);
    if (m) {
      next[m[1]] = m[2].replace(/\//g, path.sep);
    }
  }
  if (pathParts.length) {
    next.PATH = [...pathParts, process.env.PATH || ""].filter(Boolean).join(path.delimiter);
  }
  return next;
}

function phpBinaryName() {
  return process.platform === "win32" ? "php.exe" : "php";
}

function pathHasPhp(dir) {
  if (!dir) return false;
  try {
    return fs.existsSync(path.join(dir, phpBinaryName()));
  } catch {
    return false;
  }
}

function listLocalPhpCandidates(publicPath, env) {
  const candidates = [];
  const parts = (env.PATH || "").split(path.delimiter).filter(Boolean);
  candidates.push(...parts);

  const siteRoot = siteRootFromPublic(publicPath);
  for (const jsonName of ["site.json", "local-site.json", path.join("conf", "site.json")]) {
    const jsonPath = path.join(siteRoot, jsonName);
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const phpVersion = data.phpVersion || data.php_version || data?.services?.php?.version;
      if (phpVersion) {
        candidates.push(
          path.join(
            process.env.LOCALAPPDATA || "",
            "Programs/Local/lightning-services/php-" + phpVersion + "/bin/win64"
          )
        );
      }
    } catch {
      /* ignore malformed site json */
    }
  }

  if (env.PHPRC) {
    let cursor = path.dirname(env.PHPRC);
    for (let i = 0; i < 10 && cursor; i++) {
      candidates.push(path.join(cursor, "bin", "win64"));
      candidates.push(path.join(cursor, "bin"));
      cursor = path.dirname(cursor);
    }
    const siteRoot = siteRootFromPublic(publicPath);
    candidates.push(path.join(siteRoot, "bin", "win64"));
  }

  const localRoots = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Local", "lightning-services"),
    path.join(process.env.LOCALAPPDATA || "", "Local", "Programs", "Local", "lightning-services"),
  ];
  for (const localRoot of localRoots) {
    if (!fs.existsSync(localRoot)) continue;
    for (const entry of fs.readdirSync(localRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.includes("php")) continue;
      candidates.push(path.join(localRoot, entry.name, "bin", "win64"));
    }
  }

  const programFiles = process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
  if (programFiles) {
    const bundled = path.join(
      programFiles,
      "Local",
      "resources",
      "extraResources",
      "lightning-services"
    );
    if (fs.existsSync(bundled)) {
      for (const entry of fs.readdirSync(bundled, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.includes("php")) continue;
        candidates.push(path.join(bundled, entry.name, "bin", "win64"));
      }
    }
  }

  return [...new Set(candidates)];
}

function resolvePhpExe(env, publicPath) {
  for (const candidate of listLocalPhpCandidates(publicPath, env)) {
    const exe = pathHasPhp(candidate) ? path.join(candidate, phpBinaryName()) : candidate;
    if (exe.endsWith(phpBinaryName()) && fs.existsSync(exe)) {
      return exe;
    }
  }
  return null;
}

function ensurePhpInPath(env, publicPath) {
  const next = { ...env };
  const phpExe = resolvePhpExe(next, publicPath);
  if (!phpExe) {
    return next;
  }
  const phpDir = path.dirname(phpExe);
  const parts = (next.PATH || "").split(path.delimiter).filter(Boolean);
  next.PATH = [phpDir, ...parts.filter((p) => p !== phpDir)].join(path.delimiter);
  next.WP_CLI_PHP = phpExe;
  if (!next.PHPRC) {
    next.PHPRC = path.join(siteRootFromPublic(publicPath), "conf", "php", "php.ini");
  }
  return next;
}

function loadEnvrc(publicPath) {
  const envrcPath = findEnvrc(publicPath);
  let env = { ...process.env };
  if (fs.existsSync(envrcPath)) {
    env = parseEnvrcFile(envrcPath, env);
  }
  const resolved = ensurePhpInPath(env, publicPath);
  const phpExe = resolvePhpExe(resolved, publicPath);
  return {
    env: resolved,
    envrcPath,
    phpExe,
    ok: Boolean(resolved.PHPRC || phpExe),
  };
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
  const phpExe = env.WP_CLI_PHP || resolvePhpExe(env, publicPath);
  if (!phpExe || !fs.existsSync(phpExe)) {
    throw new Error(
      "PHP not found for LocalWP. Start the site in Local (Running), then run: node deploy/local/doctor.cjs --site <name>"
    );
  }
  if (!fs.existsSync(WP_PHAR)) {
    throw new Error(`WP-CLI phar not found: ${WP_PHAR}`);
  }

  const runEnv = { ...env, WP_CLI_PHP: phpExe };
  const wpArgs = [WP_PHAR, ...args, `--path=${publicPath}`];
  const r = spawnSync(phpExe, wpArgs, {
    encoding: "utf8",
    windowsHide: true,
    env: runEnv,
    stdio: capture ? "pipe" : "inherit",
  });
  if (r.error) {
    throw r.error;
  }
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

function resolveAdminUser(publicPath, env) {
  try {
    const out = wp(
      publicPath,
      ["user", "list", "--role=administrator", "--field=ID", "--format=csv"],
      env,
      true
    );
    const id = (out || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^\d+$/.test(line));
    return id || null;
  } catch {
    return null;
  }
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
  WP_PHAR,
  DEFAULT_SITES,
  DEV_ACTIVE,
  PRODUCT_ACTIVE,
  ALWAYS_OFF,
  loadEnvrc,
  resolvePhpExe,
  resolveWpPharPath,
  wp,
  pluginInstalled,
  resolveSite,
  syncRankpublish,
  detectMode,
  resolveAdminUser,
};
