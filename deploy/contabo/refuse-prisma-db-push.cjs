#!/usr/bin/env node
console.error(
  "Refused: prisma db push would try to drop WordPress wp_* tables in the shared MySQL database.\n" +
    "Use: node deploy/contabo/run-staging-schema-safe.cjs apps/web\n" +
    "That applies additive rp_* SQL only.",
);
process.exit(1);
