/**
 * Verify rankpublish-site branding deploy on staging.
 *
 * Usage:
 *   node deploy/contabo/verify-branding-deploy.cjs
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || "~/nashirwp/public_html";
const siteUrl = process.env.NASHIR_SITE_URL || "https://nashir.satest.top";

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => {
        out += d.toString();
      });
      stream.stderr.on("data", (d) => {
        errOut += d.toString();
      });
      stream.on("close", (code) => {
        if (code) {
          reject(new Error((errOut || out || `exit ${code}`).trim()));
          return;
        }
        resolve(out.trim());
      });
    });
  });
}

function httpsGet(url) {
  return new Promise((resolve) => {
    https
      .get(url, { timeout: 20000 }, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            body,
          })
        );
      })
      .on("error", (error) => resolve({ status: 0, body: "", error: error.message }));
  });
}

function check(label, pass, detail = "") {
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

(async () => {
  let failed = 0;
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host, port: 22, username, password, readyTimeout: 120000 });
  });

  try {
    console.log(`\nBranding deploy verification — ${siteUrl}\n${"=".repeat(48)}\n`);
    const wp = `cd ${remoteRoot} && wp`;

    const pluginStatus = await exec(
      conn,
      `${wp} plugin is-active rankpublish-site && echo active || echo inactive`
    );
    if (!check("rankpublish-site active", pluginStatus.trim() === "active", pluginStatus)) failed++;

    const thinkrankStatus = await exec(
      conn,
      `${wp} plugin is-active thinkrank && echo active || echo inactive`
    );
    if (!check("thinkrank active", thinkrankStatus.trim() === "active", thinkrankStatus)) failed++;

    const jsPath = `${remoteRoot}/wp-content/plugins/rankpublish-site/assets/branding/admin-overrides.js`;
    const remoteJs = await exec(conn, `grep -E 'hideThinkRankUpsells|shouldSkipHide|PROTECTED_ROOT_SELECTORS|isThinkRankSettingsScreen' ${jsPath}`);
    const markers = [
      "hideModuleUpsells",
      "hideModuleUpsellsSafe",
      "shouldSkipHide",
      "PROTECTED_ROOT_SELECTORS",
      "isUpstreamModuleScreen",
    ];
    for (const marker of markers) {
      if (!check(`admin-overrides.js contains ${marker}`, remoteJs.includes(marker))) failed++;
    }

    const health = await httpsGet(`${siteUrl}/api/health`);
    if (!check("SaaS health endpoint", health.status === 200 && health.body.includes('"ok":true'), `HTTP ${health.status}`)) {
      failed++;
    }

    const home = await httpsGet(`${siteUrl}/`);
    if (!check("Marketing homepage", home.status === 200, `HTTP ${home.status}`)) failed++;

    const asset = await httpsGet(
      `${siteUrl}/wp-content/plugins/rankpublish-site/assets/branding/admin-overrides.js`
    );
    if (
      !check(
        "Branding asset publicly served",
        asset.status === 200 && asset.body.includes("hideThinkRankUpsells"),
        `HTTP ${asset.status}`
      )
    ) {
      failed++;
    }

    const thinkrankAdmin = await httpsGet(`${siteUrl}/wp-admin/admin.php?page=thinkrank`);
    if (
      !check(
        "ThinkRank admin route responds",
        thinkrankAdmin.status === 302 || thinkrankAdmin.status === 200,
        `HTTP ${thinkrankAdmin.status}`
      )
    ) {
      failed++;
    }

    const report = {
      siteUrl,
      verifiedAt: new Date().toISOString(),
      failed,
      pluginStatus,
      thinkrankStatus,
    };
    const out = path.join(__dirname, "reports", "verify-branding-deploy.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nReport: ${out}`);

    conn.end();
    if (failed) process.exit(1);
  } catch (error) {
    conn.end();
    console.error(error.message || error);
    process.exit(1);
  }
})();
