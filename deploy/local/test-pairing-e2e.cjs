/**
 * Full E2E pairing test (requires SaaS dev server + DATABASE_URL).
 *
 * Usage:
 *   APP_URL=https://nashir.satest.top node deploy/local/test-pairing-e2e.cjs --site rankpublish-test
 */
const fs = require("fs");
const path = require("path");
const { resolveSite, loadEnvrc, wp } = require("./lib/local-wp.cjs");
const { DEFAULT_APP_URL } = require("./environments.cjs");

const APP_URL = (process.env.APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
const TEST_EMAIL = process.env.TEST_EMAIL || "connector-test@rankpublish.local";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "RankPublish-Test-2026!";

const siteArg =
  process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] ||
  (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : null);

const { key, publicPath } = resolveSite(siteArg || "rankpublish-test");
const { env, ok } = loadEnvrc(publicPath);

if (!ok) {
  console.error("PHPRC missing — open Local site shell once.");
  process.exit(1);
}

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function ensureSession() {
  const login = await jsonFetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (login.response.ok) {
    return login.response.headers.get("set-cookie") ?? "";
  }

  const register = await jsonFetch(`${APP_URL}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ name: "Connector Test", email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (!register.response.ok) {
    throw new Error(`Auth failed: ${JSON.stringify(register.data)}`);
  }

  const retry = await jsonFetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (!retry.response.ok) {
    throw new Error(`Login after register failed: ${JSON.stringify(retry.data)}`);
  }

  return retry.response.headers.get("set-cookie") ?? "";
}

(async () => {
  console.log(`\nPairing E2E — ${key} → ${APP_URL}\n${"=".repeat(40)}\n`);

  const health = await fetch(`${APP_URL}/`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!health?.ok) {
    console.error(`SaaS not reachable at ${APP_URL}. Deploy apps/web to staging or set APP_URL.`);
    process.exit(1);
  }

  const cookie = await ensureSession();

  const pairing = await jsonFetch(`${APP_URL}/api/v1/pairing`, {
    method: "POST",
    headers: { Cookie: cookie },
  });

  if (!pairing.response.ok || !pairing.data.code) {
    throw new Error(`Pairing code failed: ${JSON.stringify(pairing.data)}`);
  }

  const code = pairing.data.code;
  console.log("Pairing code:", code);

  const pairPhp = `<?php
$result = \\RankPublish\\Connector\\Cloud_Client::pair('${APP_URL}', '${code}');
if (is_wp_error($result)) {
  echo wp_json_encode(['ok' => false, 'error' => $result->get_error_message()]);
  return;
}
\\RankPublish\\Connector\\Cloud_Client::store_connection($result, '${APP_URL}');
$sync = \\RankPublish\\Connector\\Cloud_Client::sync_capabilities();
echo wp_json_encode([
  'ok' => true,
  'site_id' => $result['site_id'] ?? null,
  'sync_ok' => !is_wp_error($sync),
  'capabilities' => is_wp_error($sync) ? 0 : count($sync['capabilities'] ?? []),
]);
`;

  const tmp = path.join(require("os").tmpdir(), "rankpublish-pair-e2e.php");
  fs.writeFileSync(tmp, pairPhp);

  const out = wp(publicPath, ["eval-file", tmp], env, true);
  const report = JSON.parse(out);
  console.log("WP pair:", JSON.stringify(report, null, 2));

  if (!report.ok) {
    throw new Error(report.error || "WP pairing failed");
  }

  const caps = await jsonFetch(`${APP_URL}/api/v1/sites/${report.site_id}/capabilities`, {
    headers: { Cookie: cookie },
  });

  console.log("SaaS capabilities:", caps.response.status, (caps.data.capabilities ?? []).length);

  const pass =
    report.ok &&
    report.sync_ok &&
    caps.response.ok &&
    Array.isArray(caps.data.capabilities) &&
    caps.data.capabilities.length > 0;

  if (!pass) {
    console.error("\nFAIL — pairing E2E incomplete");
    process.exit(1);
  }

  console.log("\nPASS — pairing + capabilities sync OK");
})()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
