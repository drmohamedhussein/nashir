#!/usr/bin/env node
/**
 * Apply SaaS rp_* tables inside the WordPress MySQL database.
 * Never drops wp_* tables. Refuses SQL that would.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const webDir = process.argv[2] || path.join(__dirname, "../../apps/web");
const envPath = path.join(webDir, ".env");
const envText = fs.readFileSync(envPath, "utf8");
const match = envText.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error("No DATABASE_URL in", envPath);
  process.exit(1);
}

const url = new URL(match[1].replace(/^mysql:/, "http:"));
const user = decodeURIComponent(url.username);
const pass = decodeURIComponent(url.password);
const db = url.pathname.replace(/^\//, "");
const host = url.hostname;
const port = url.port || "3306";

function assertWordpressSafe(sql, label) {
  if (/drop\s+table\s+[`']?wp_/i.test(sql) || /drop\s+database/i.test(sql)) {
    throw new Error(`${label} refuses to drop WordPress tables`);
  }
}

function mysql(sql, extraArgs = []) {
  const result = spawnSync("mysql", ["-h", host, "-P", port, "-u", user, `-p${pass}`, db, ...extraArgs], {
    input: sql,
    encoding: "utf8",
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status) {
    throw new Error(`mysql failed (${result.status})`);
  }
}

const createPath = path.join(webDir, "prisma/create-rp-tables.sql");
const alterPath = path.join(__dirname, "staging-schema-safe.sql");
let createSql = fs.readFileSync(createPath, "utf8");
createSql = createSql.replace(/CREATE TABLE `/g, "CREATE TABLE IF NOT EXISTS `");
createSql = createSql.split(/-- AddForeignKey/)[0];
const alterSql = fs.readFileSync(alterPath, "utf8");

assertWordpressSafe(createSql, "create-rp-tables.sql");
assertWordpressSafe(alterSql, "staging-schema-safe.sql");

const wpCheck = spawnSync(
  "mysql",
  ["-h", host, "-P", port, "-u", user, `-p${pass}`, "-N", "-B", db, "-e", "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wp_options'"],
  { encoding: "utf8" },
);
const wpTables = Number((wpCheck.stdout || "0").trim());
if (wpTables > 0) {
  console.log("wordpress_tables_present=1 (SaaS will only create/alter rp_* tables)");
} else {
  console.log("wordpress_tables_present=0 (SaaS-only database; still refusing wp_* drops)");
}

mysql(createSql);
mysql(alterSql);
console.log("wp_safe_schema_applied");
