#!/usr/bin/env node
/**
 * Run on staging server — applies safe rp_* schema SQL using DATABASE_URL from .env
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

const sqlPath = path.join(__dirname, "staging-schema-safe.sql");
if (!fs.existsSync(sqlPath)) {
  console.error("Missing", sqlPath);
  process.exit(1);
}

const result = spawnSync(
  "mysql",
  ["-h", host, "-P", port, "-u", user, `-p${pass}`, db],
  { input: fs.readFileSync(sqlPath), encoding: "utf8" }
);

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status || 0);
