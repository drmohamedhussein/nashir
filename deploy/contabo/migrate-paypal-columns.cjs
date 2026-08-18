/**
 * Safely rename Stripe billing columns to PayPal on shared MySQL (staging/production).
 * Run via SSH: node deploy/contabo/migrate-paypal-columns.cjs
 *
 * Env: NASHIR_SSH_*, optional NASHIR_MYSQL_USER / NASHIR_MYSQL_PASS / NASHIR_MYSQL_DB
 */
const path = require("path");
const { Client } = require("./lib/ssh2-client.cjs");

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const mysqlUser = process.env.NASHIR_MYSQL_USER || "Dnh0lge57UHlNg5N";
const mysqlPass = process.env.NASHIR_MYSQL_PASS || process.env.NASHIR_MYSQL_PASSWORD || "";
const mysqlDb = process.env.NASHIR_MYSQL_DB || "nashirwp_WKBlixyk";

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve(out)));
    });
  });
}

const sql = `
SET @db = '${mysqlDb}';

SET @has_stripe_customer := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rp_subscription' AND COLUMN_NAME = 'stripeCustomerId'
);
SET @has_paypal_payer := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rp_subscription' AND COLUMN_NAME = 'paypalPayerId'
);

SET @ddl1 := IF(@has_stripe_customer = 1 AND @has_paypal_payer = 0,
  'ALTER TABLE rp_subscription CHANGE stripeCustomerId paypalPayerId VARCHAR(191) NULL',
  'SELECT 1');
PREPARE s1 FROM @ddl1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_stripe_sub := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rp_subscription' AND COLUMN_NAME = 'stripeSubscriptionId'
);
SET @has_paypal_sub := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rp_subscription' AND COLUMN_NAME = 'paypalSubscriptionId'
);

SET @ddl2 := IF(@has_stripe_sub = 1 AND @has_paypal_sub = 0,
  'ALTER TABLE rp_subscription CHANGE stripeSubscriptionId paypalSubscriptionId VARCHAR(191) NULL',
  'SELECT 1');
PREPARE s2 FROM @ddl2; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @add_payer := IF(@has_paypal_payer = 0 AND @has_stripe_customer = 0,
  'ALTER TABLE rp_subscription ADD COLUMN paypalPayerId VARCHAR(191) NULL',
  'SELECT 1');
PREPARE s3 FROM @add_payer; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @add_sub := IF(@has_paypal_sub = 0 AND @has_stripe_sub = 0,
  'ALTER TABLE rp_subscription ADD COLUMN paypalSubscriptionId VARCHAR(191) NULL',
  'SELECT 1');
PREPARE s4 FROM @add_sub; EXECUTE s4; DEALLOCATE PREPARE s4;

SELECT COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rp_subscription'
  AND COLUMN_NAME LIKE '%paypal%' OR COLUMN_NAME LIKE '%stripe%';
`.trim();

if (!host || !username || !password) {
  console.error("Missing NASHIR_SSH_* env");
  process.exit(1);
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await exec(
        conn,
        `python3 - <<'PY'\nfrom pathlib import Path\nPath('/tmp/rp_paypal_cols.sql').write_text(${JSON.stringify(sql)}, encoding='utf-8')\nprint('sql_written')\nPY`,
      );
      await exec(conn, `bash -lc "mysql -u${mysqlUser} -p${mysqlPass} ${mysqlDb} < /tmp/rp_paypal_cols.sql"`);
      console.log("\n✓ PayPal column migration complete");
      conn.end();
    } catch (error) {
      console.error(error.message || error);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
