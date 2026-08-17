/**
 * Connector smoke test on LocalWP (no SaaS required).
 *
 * Usage: node deploy/local/test-connector.cjs --site rankpublish-test
 */
const fs = require("fs");
const path = require("path");
const { resolveSite, loadEnvrc, wp } = require("./lib/local-wp.cjs");

const siteArg = process.argv.find((a) => a.startsWith("--site="))?.split("=")[1]
  || (process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : null);

const { key, publicPath } = resolveSite(siteArg || "rankpublish-test");
const { env, ok } = loadEnvrc(publicPath);

if (!ok) {
  console.error("PHPRC missing — open Local site shell once or run from LocalWP terminal.");
  process.exit(1);
}

const evalPhp = `<?php
$health = rest_do_request(new WP_REST_Request('GET', '/rankpublish/v1/health'));
$code = $health->get_status();
$data = $health->get_data();
$integrations = is_array($data['integrations'] ?? null) ? count($data['integrations']) : 0;
echo wp_json_encode([
  'site' => '${key}',
  'health_status' => $code,
  'health' => $data,
  'integrations_count' => $integrations,
  'connector_class' => class_exists('RankPublish\\\\Connector\\\\Connector'),
  'rankpublish_version' => defined('RANKPUBLISH_VERSION') ? RANKPUBLISH_VERSION : null,
], JSON_PRETTY_PRINT);
`;

const tmp = path.join(require("os").tmpdir(), "rankpublish-connector-test.php");
fs.writeFileSync(tmp, evalPhp);

try {
  console.log(`\nConnector smoke test — ${key}\n${"=".repeat(40)}\n`);
  const out = wp(publicPath, ["eval-file", tmp], env, true);
  const report = JSON.parse(out);
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.health_status === 200 &&
    report.connector_class === true &&
    report.integrations_count > 0 &&
    Array.isArray(report.health?.integrations) &&
    report.health.integrations.length > 0;

  if (!pass) {
    console.error("\nFAIL — connector not healthy");
    process.exit(1);
  }
  console.log("\nPASS — connector OK");
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
} finally {
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
