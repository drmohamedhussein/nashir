import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "../..");

function readSql(rel: string): string {
  return readFileSync(path.join(webRoot, rel), "utf8");
}

describe("WordPress-safe SaaS schema", () => {
  const createSql = readSql("prisma/create-rp-tables.sql");
  const safeSql = readSql("../../deploy/contabo/staging-schema-safe.sql");
  const combined = `${createSql}\n${safeSql}`;

  it("never drops WordPress core tables", () => {
    expect(combined).not.toMatch(/drop\s+table\s+[`']?wp_/i);
    expect(combined).not.toMatch(/drop\s+database/i);
  });

  it("only creates rp_ prefixed SaaS tables", () => {
    const creates = [...createSql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? `([^`]+)`/gi)].map((m) => m[1]);
    expect(creates.length).toBeGreaterThan(5);
    expect(creates.every((name) => name.startsWith("rp_"))).toBe(true);
  });

  it("defaults new users to English", () => {
    expect(createSql).toMatch(/`locale` VARCHAR\(191\) NOT NULL DEFAULT 'en'/);
  });

  it("deploy-saas never runs prisma db push against the WordPress database", () => {
    const deploy = readSql("../../deploy/contabo/deploy-saas.cjs");
    expect(deploy).not.toMatch(/prisma db push/);
    expect(deploy).toMatch(/run-staging-schema-safe\.cjs/);
  });
});
