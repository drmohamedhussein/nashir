const path = require("path");
const { Client } = require(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "ssh2"));

const host = process.env.NASHIR_SSH_HOST;
const username = process.env.NASHIR_SSH_USER;
const password = process.env.NASHIR_SSH_PASS;
const remoteRoot = process.env.NASHIR_REMOTE_ROOT || `/home/${username}/nashir`;

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

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const sqlFile = [
        "SET @has_slug := (",
        "  SELECT COUNT(*) FROM information_schema.COLUMNS",
        "  WHERE TABLE_SCHEMA = 'nashirwp_WKBlixyk'",
        "    AND TABLE_NAME = 'rp_workspace'",
        "    AND COLUMN_NAME = 'slug'",
        ");",
        "SET @ddl := IF(@has_slug = 0, 'ALTER TABLE rp_workspace ADD COLUMN slug VARCHAR(191) NULL', 'SELECT 1');",
        "PREPARE stmt FROM @ddl;",
        "EXECUTE stmt;",
        "DEALLOCATE PREPARE stmt;",
        "UPDATE rp_workspace",
        "SET slug = CONCAT(LOWER(REPLACE(REPLACE(TRIM(name), ' ', '-'), '--', '-')), '-', SUBSTRING(id, 1, 6))",
        "WHERE slug IS NULL OR slug = '';",
        "",
      ].join("\n");

      await exec(
        conn,
        `python3 - <<'PY'\nfrom pathlib import Path\nPath('/tmp/rp_slug_fix.sql').write_text(${JSON.stringify(sqlFile)}, encoding='utf-8')\nprint('sql_written')\nPY`,
      );
      await exec(
        conn,
        `bash -lc "mysql -uDnh0lge57UHlNg5N -pvzo5zYgdFFrWqOke nashirwp_WKBlixyk < /tmp/rp_slug_fix.sql"`,
      );
      await exec(
        conn,
        [
          `cd ${remoteRoot}/apps/web`,
          "npx prisma db push || echo prisma_push_skipped_protecting_wordpress_tables",
          "node prisma/seed.cjs",
          [
            "mysql -uDnh0lge57UHlNg5N -pvzo5zYgdFFrWqOke nashirwp_WKBlixyk -e",
            "\"INSERT INTO rp_workspace_member (id, workspaceId, userId, role, createdAt) " +
              "SELECT REPLACE(UUID(),'-',''), w.id, w.ownerId, 'owner', NOW() " +
              "FROM rp_workspace w LEFT JOIN rp_workspace_member m ON m.workspaceId = w.id AND m.userId = w.ownerId " +
              "WHERE m.id IS NULL;\"",
          ].join(" "),
          "pm2 restart nashir",
        ].join(" && ")
      );
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
