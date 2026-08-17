#!/usr/bin/env bash
set -euo pipefail

ROOT="${NASHIR_ROOT:-/var/www/nashir}"
cd "$ROOT/apps/web"

if [[ ! -f .env ]]; then
  echo "Create $ROOT/apps/web/.env before running setup."
  exit 1
fi

export NODE_ENV=production
npm ci
npx prisma generate
npx prisma db push
npm run build

pm2 start "$ROOT/deploy/contabo/ecosystem.config.cjs" || pm2 reload nashir
pm2 save

echo "Nashir is running on 127.0.0.1:3000. Point Nginx at it and set APP_URL to the public HTTPS domain."
