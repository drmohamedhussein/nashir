/**
 * Signed REST smoke test (LocalWP only — no SaaS/DB required).
 *
 * 1. Seeds a temporary signing secret in WP options
 * 2. Calls signed /capabilities and /posts via HTTP
 *
 * Usage: node deploy/local/test-signed-rest.cjs --site rankpublish-test
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { resolveSite, loadEnvrc, wp } = require("./lib/local-wp.cjs");

const siteArg =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : null);

const { key, publicPath } = resolveSite(siteArg || "rankpublish-test");
const { env, ok } = loadEnvrc(publicPath);

if (!ok) {
  console.error("PHPRC missing — open Local site shell once.");
  process.exit(1);
}

const secret = crypto.randomBytes(16).toString("hex");
const siteId = "local-test-" + Date.now();

function sign(timestamp, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function signedGet(baseUrl, route) {
  const url = new URL(route.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = "";
  const signature = sign(timestamp, body);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-RankPublish-Timestamp": timestamp,
      "X-RankPublish-Signature": signature,
      "X-Nashir-Timestamp": timestamp,
      "X-Nashir-Signature": signature,
    },
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }
  return { status: response.status, data };
}

const seedPhp = `<?php
update_option('rankpublish_site_id', '${siteId}');
update_option('rankpublish_signing_secret', '${secret}');
update_option('nashir_site_id', '${siteId}');
update_option('nashir_signing_secret', '${secret}');
echo wp_json_encode(['seeded' => true, 'site_id' => '${siteId}']);
`;

const tmp = path.join(require("os").tmpdir(), "rankpublish-seed-connect.php");
fs.writeFileSync(tmp, seedPhp);

(async () => {
  console.log(`\nSigned REST test — ${key}\n${"=".repeat(40)}\n`);

  const seedOut = wp(publicPath, ["eval-file", tmp], env, true);
  console.log("Seed:", seedOut.trim());

  const restBase = wp(publicPath, ["eval", "echo rest_url('rankpublish/v1/');"], env, true).trim();
  console.log("REST base:", restBase);

  const cap = await signedGet(restBase, "capabilities");
  const posts = await signedGet(restBase, "posts?per_page=5");

  console.log("\ncapabilities:", cap.status, JSON.stringify(cap.data, null, 2).slice(0, 500));
  console.log("\nposts:", posts.status, `count=${posts.data.posts?.length ?? 0}`);

  const pass =
    cap.status === 200 &&
    Array.isArray(cap.data.capabilities) &&
    cap.data.capabilities.length > 0 &&
    posts.status === 200 &&
    Array.isArray(posts.data.posts);

  if (!pass) {
    console.error("\nFAIL — signed REST check failed");
    process.exit(1);
  }

  console.log("\nPASS — signed REST OK");
})()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  });
