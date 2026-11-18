#!/bin/sh
set -eu

docker compose --project-name "${STACK_NAME}_migration" -f docker/migration/compose.yml run --rm --no-deps migrate
