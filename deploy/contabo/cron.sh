#!/usr/bin/env bash
set -euo pipefail

# crontab: * * * * * /var/www/nashir/deploy/contabo/cron.sh
# Requires CRON_SECRET and APP_URL in /var/www/nashir/apps/web/.env

ENV_FILE="${NASHIR_ENV:-/var/www/nashir/apps/web/.env}"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

curl -fsS -X POST "${APP_URL}/api/cron/tick" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Accept: application/json"
