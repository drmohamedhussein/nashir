/**
 * Historical Postgres bootstrap — disabled.
 * RankPublish SaaS shares the WordPress MySQL database (rp_* tables).
 */
console.error(
  "Refused: do not provision Postgres. SaaS tables live as rp_* in the WordPress MySQL database.\n" +
    "Use: node deploy/contabo/run-staging-schema-safe.cjs apps/web",
);
process.exit(1);
