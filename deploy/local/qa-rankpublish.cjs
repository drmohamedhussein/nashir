/**
 * QA checklist for RankPublish LocalWP sites (product or dev stack).
 *
 * Usage:
 *   node deploy/local/qa-rankpublish.cjs
 *   node deploy/local/qa-rankpublish.cjs --site rankpublish-test
 *   node deploy/local/qa-rankpublish.cjs --site rankpublish
 *
 * Writes: deploy/local/reports/qa-<site>-<date>.json
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const {
  loadEnvrc,
  wp,
  resolveSite,
  detectMode,
  resolveAdminUser,
  DEV_ACTIVE,
  PRODUCT_ACTIVE,
} = require("./lib/local-wp.cjs");

function stripWpOutput(output) {
  const lines = (output || "").split(/\r?\n/);
  const jsonStart = lines.findIndex((l) => /^[\[{]/.test(l.trim()));
  if (jsonStart >= 0) {
    return lines.slice(jsonStart).join("\n").trim();
  }
  return (output || "").replace(/^Warning:.*\n/gm, "").trim();
}

const siteArg = process.argv.find((a, i) => process.argv[i - 1] === "--site");
const { key, publicPath } = resolveSite(siteArg || "rankpublish-test");
const { env, ok, phpExe, envrcPath } = loadEnvrc(publicPath);

if (!ok || !phpExe) {
  console.error("LocalWP PHP not ready.");
  console.error("envrc:", envrcPath);
  console.error("Run: node deploy/local/doctor.cjs --site " + key);
  process.exit(1);
}

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);
const reportPath = path.join(reportsDir, `qa-${key}-${stamp}.json`);
const qaPhp = path.join(__dirname, "qa-check.php");

const checks = [];
let requiredFailed = 0;
let adminUserId = null;

function add(id, label, pass, detail = "", required = true) {
  checks.push({ id, label, pass, detail, required });
  const mark = pass ? "PASS" : required ? "FAIL" : "WARN";
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (required && !pass) requiredFailed++;
}

function wpEvalFile(check) {
  const args = ["eval-file", qaPhp, check];
  if (adminUserId) {
    args.push(`--user=${adminUserId}`);
  }
  return stripWpOutput(wp(publicPath, args, env, true));
}

function httpGet(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https://") ? https : http;
    const req = lib.get(url, { timeout: 15000, rejectUnauthorized: false }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: body.slice(0, 5000) })
      );
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function parseJson(raw, fallback = {}) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function runProductChecks(plugins, active) {
  add("mode", "Site in product mode", true, "detected: product");

  add(
    "plugin-rankpublish",
    "rankpublish active",
    active.has("rankpublish"),
    active.has("rankpublish") ? plugins.find((p) => p.name === "rankpublish")?.version : ""
  );
  add(
    "plugin-upstream-off",
    "Upstream plugins inactive",
    !["wp-scheduled-posts", "thinkrank", "thinkrank-pro"].some((s) => active.has(s)),
    [...active].join(", ")
  );

  const v = parseJson(wpEvalFile("versions"));
  add("ver-rankpublish", "RANKPUBLISH_VERSION", Boolean(v.rankpublish), v.rankpublish || "");
  add("ver-schedule", "WPSP_VERSION (embedded)", Boolean(v.schedule), v.schedule || "");
  add("ver-thinkrank", "THINKRANK_VERSION (embedded)", Boolean(v.thinkrank), v.thinkrank || "");

  const m = parseJson(wpEvalFile("modules"));
  add("mod-schedule", "Schedule module loaded", m.schedule === true, String(m.schedule));
  add("mod-schedule-pro", "Schedule Pro module loaded", m.schedule_pro === true, String(m.schedule_pro));
  add("mod-seo", "SEO module loaded", m.seo === true, String(m.seo));
  add("mod-seo-pro", "SEO Pro module loaded", m.seo_pro === true, String(m.seo_pro));

  const menuData = parseJson(wpEvalFile("menus"), { menu: false, pages: [] });
  add(
    "menu-rankpublish",
    "RankPublish admin menu registered",
    menuData.menu === true,
    `${menuData.pages?.length || 0} subpages`
  );

  const expectedPages = [
    "rankpublish",
    "thinkrank",
    "thinkrank-essential-seo",
    "thinkrank-license",
  ];
  const optionalPages = ["schedulepress", "schedulepress-calendar", "thinkrank_setup_wizard"];
  for (const page of expectedPages) {
    add(`menu-${page}`, `Submenu: ${page}`, (menuData.pages || []).includes(page));
  }
  for (const page of optionalPages) {
    const has = (menuData.pages || []).includes(page);
    add(`menu-${page}`, `Submenu (optional): ${page}`, has, has ? "ok" : "visible in browser QA", false);
  }

  return { versions: v, modules: m };
}

function runDevChecks(plugins, active) {
  add("mode", "Site in dev stack mode", true, "detected: dev");

  add(
    "plugin-rpsite",
    "rankpublish-site active",
    active.has("rankpublish-site"),
    active.has("rankpublish-site")
      ? plugins.find((p) => p.name === "rankpublish-site")?.version
      : ""
  );
  add(
    "plugin-upstream-on",
    "Upstream plugins active",
    ["thinkrank", "wp-scheduled-posts"].every((s) => active.has(s)),
    ["thinkrank", "wp-scheduled-posts", "wp-scheduled-posts-pro", "thinkrank-pro"]
      .filter((s) => active.has(s))
      .join(", ")
  );
  add(
    "plugin-rankpublish-off",
    "rankpublish inactive (dev stack)",
    !active.has("rankpublish"),
    active.has("rankpublish") ? "should deactivate rankpublish" : "ok"
  );

  const devCoreMissing = DEV_ACTIVE.filter((s) => s !== "rankpublish" && !active.has(s));
  add(
    "plugin-dev-core",
    "Dev stack core plugins active",
    devCoreMissing.length === 0,
    devCoreMissing.length ? `missing: ${devCoreMissing.join(", ")}` : DEV_ACTIVE.join(", ")
  );

  const v = parseJson(wpEvalFile("dev-versions"));
  add("ver-rpsite", "RPSITE_VERSION", Boolean(v.rpsite), v.rpsite || "");
  add("ver-thinkrank", "THINKRANK_VERSION (upstream)", Boolean(v.thinkrank), v.thinkrank || "");
  add("ver-schedule", "WPSP_VERSION (upstream)", Boolean(v.schedule), v.schedule || "");

  const menuData = parseJson(wpEvalFile("dev-menus"), {
    thinkrank: false,
    schedulepress: false,
    pages: [],
  });
  add("menu-thinkrank", "ThinkRank admin page registered", menuData.thinkrank === true);
  add(
    "menu-schedulepress",
    "SchedulePress admin page registered",
    menuData.schedulepress === true
  );
  add(
    "menu-rpsite-loaded",
    "rankpublish-site bootstrap loaded",
    menuData.rpsite === true,
    menuData.rpsite ? "RPSITE_VERSION defined" : "plugin not bootstrapped"
  );

  return { versions: v, modules: {} };
}

function runMixedModeHint(mode) {
  add(
    "mode",
    "Site mode recognized",
    false,
    `detected: ${mode} — run switch-product-mode.cjs dev|product --site ${key}`
  );
}

function runCommonChecks(siteUrl) {
  const tables = wpEvalFile("tables");
  add("db-tables", "Plugin DB tables present", Number(tables) > 0, `${tables} tables`);

  return httpGet(siteUrl).then((home) => {
    add(
      "http-home",
      "Front page responds",
      home.status >= 200 && home.status < 400,
      home.status ? `HTTP ${home.status}` : home.error
    );

    const adminUrl = siteUrl.replace(/\/$/, "") + "/wp-admin/";
    return httpGet(adminUrl).then((admin) => {
      add(
        "http-admin-login",
        "wp-admin reachable",
        admin.status === 200 || admin.status === 302,
        admin.status ? `HTTP ${admin.status}` : admin.error
      );
    });
  });
}

function runPhpLogCheck() {
  const logPath = path.join(path.dirname(publicPath), "..", "logs", "php", "error.log");
  let recentFatals = [];
  if (fs.existsSync(logPath)) {
    const tail = fs.readFileSync(logPath, "utf8").split(/\r?\n/).slice(-80).join("\n");
    const lines = tail.split(/\r?\n/);
    recentFatals = lines.filter(
      (line) =>
        /PHP Fatal error|Uncaught Error/.test(line) &&
        !line.includes("strict_types declaration must be the very first statement")
    );
  }
  add(
    "php-log",
    "No recent PHP fatals in Local log",
    recentFatals.length === 0,
    recentFatals.length ? `${recentFatals.length} fatal(s) in last 80 lines` : "clean"
  );
}

(async () => {
  console.log(`\nRankPublish QA — ${key}\n${"=".repeat(40)}\n`);

  adminUserId = resolveAdminUser(publicPath, env);
  if (adminUserId) {
    console.log(`WP-CLI user: administrator ID ${adminUserId}\n`);
  } else {
    console.log("WP-CLI user: (none — eval-file runs without --user)\n");
  }

  const mode = detectMode(publicPath, env);
  const plugins = JSON.parse(
    wp(publicPath, ["plugin", "list", "--format=json"], env, true) || "[]"
  );
  const active = new Set(plugins.filter((p) => p.status === "active").map((p) => p.name));

  let v = {};
  let m = {};

  if (mode === "product") {
    ({ versions: v, modules: m } = runProductChecks(plugins, active));
  } else if (mode === "dev") {
    ({ versions: v, modules: m } = runDevChecks(plugins, active));
  } else {
    runMixedModeHint(mode);
    add(
      "plugin-hint",
      "Expected plugin set unclear",
      false,
      `product wants: ${PRODUCT_ACTIVE.join(", ")} | dev wants: ${DEV_ACTIVE.join(", ")}`,
      false
    );
  }

  const siteUrl = wpEvalFile("home");
  await runCommonChecks(siteUrl);
  runPhpLogCheck();

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;

  const report = {
    site: key,
    publicPath,
    url: siteUrl,
    auditedAt: new Date().toISOString(),
    mode,
    adminUserId,
    versions: v,
    modules: m,
    summary: { passed, failed, total: checks.length, requiredFailed },
    checks,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Result: ${passed}/${checks.length} passed, ${failed} failed (${requiredFailed} required)`);
  console.log(`Report: ${reportPath}`);

  if (requiredFailed) process.exit(1);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
