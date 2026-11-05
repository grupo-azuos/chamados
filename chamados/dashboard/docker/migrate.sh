#!/bin/sh
set -eu

docker compose --project-name "${APP_NAME}_${DEPLOY_ENV}_migration" -f docker/migration/compose.yml run --rm --no-deps migrate
