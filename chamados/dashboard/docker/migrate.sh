#!/bin/sh
set -eu

docker compose --project-name "$APP_NAME-$DEPLOY_ENV-migration" -f docker/migration/compose.yml run --rm --no-deps migrate
