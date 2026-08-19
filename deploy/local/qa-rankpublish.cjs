/**
 * QA checklist for RankPublish product mode on LocalWP.
 *
 * Usage:
 *   node deploy/local/qa-rankpublish.cjs
 *   node deploy/local/qa-rankpublish.cjs --site rankpublish-test
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

function add(id, label, pass, detail = "", required = true) {
  checks.push({ id, label, pass, detail, required });
  const mark = pass ? "PASS" : required ? "FAIL" : "WARN";
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (required && !pass) requiredFailed++;
}

function wpEvalFile(check) {
  return stripWpOutput(
    wp(publicPath, ["eval-file", qaPhp, check, "--user=admin"], env, true)
  );
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

(async () => {
  console.log(`\nRankPublish QA — ${key}\n${"=".repeat(40)}\n`);

  const mode = detectMode(publicPath, env);
  add("mode", "Site in product mode", mode === "product", `detected: ${mode}`);

  const plugins = JSON.parse(
    wp(publicPath, ["plugin", "list", "--format=json"], env, true) || "[]"
  );
  const active = new Set(plugins.filter((p) => p.status === "active").map((p) => p.name));

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

  const versions = wpEvalFile("versions");
  let v = {};
  try {
    v = JSON.parse(versions);
  } catch {
    v = {};
  }
  add("ver-rankpublish", "RANKPUBLISH_VERSION", Boolean(v.rankpublish), v.rankpublish || "");
  add("ver-schedule", "WPSP_VERSION (embedded)", Boolean(v.schedule), v.schedule || "");
  add("ver-thinkrank", "THINKRANK_VERSION (embedded)", Boolean(v.thinkrank), v.thinkrank || "");

  const modules = wpEvalFile("modules");
  let m = {};
  try {
    m = JSON.parse(modules);
  } catch {
    m = {};
  }
  add("mod-schedule", "Schedule module loaded", m.schedule === true, String(m.schedule));
  add("mod-schedule-pro", "Schedule Pro module loaded", m.schedule_pro === true, String(m.schedule_pro));
  add("mod-seo", "SEO module loaded", m.seo === true, String(m.seo));
  add("mod-seo-pro", "SEO Pro module loaded", m.seo_pro === true, String(m.seo));

  const menus = wpEvalFile("menus");
  let menuData = { menu: false, pages: [] };
  try {
    menuData = JSON.parse(menus);
  } catch {
    menuData = { menu: false, pages: [] };
  }
  add("menu-rankpublish", "RankPublish admin menu registered", menuData.menu === true, `${menuData.pages?.length || 0} subpages`);

  const expectedPages = [
    "rankpublish",
    "thinkrank",
    "thinkrank-essential-seo",
    "thinkrank-license",
  ];
  const optionalPages = ["schedulepress", "schedulepress-calendar", "thinkrank_setup_wizard"];
  for (const page of expectedPages) {
    const has = (menuData.pages || []).includes(page);
    add(`menu-${page}`, `Submenu: ${page}`, has);
  }
  for (const page of optionalPages) {
    const has = (menuData.pages || []).includes(page);
    add(`menu-${page}`, `Submenu (optional): ${page}`, has, has ? "ok" : "visible in browser QA", false);
  }

  const siteUrl = wpEvalFile("home");

  const tables = wpEvalFile("tables");
  add("db-tables", "Plugin DB tables present", Number(tables) > 0, `${tables} tables`);

  const home = await httpGet(siteUrl);
  add(
    "http-home",
    "Front page responds",
    home.status >= 200 && home.status < 400,
    home.status ? `HTTP ${home.status}` : home.error
  );

  const adminUrl = siteUrl.replace(/\/$/, "") + "/wp-admin/";
  const admin = await httpGet(adminUrl);
  add(
    "http-admin-login",
    "wp-admin reachable",
    admin.status === 200 || admin.status === 302,
    admin.status ? `HTTP ${admin.status}` : admin.error
  );

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

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;

  const report = {
    site: key,
    publicPath,
    url: siteUrl,
    auditedAt: new Date().toISOString(),
    mode,
    versions: v,
    modules: m,
    summary: { passed, failed, total: checks.length },
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
