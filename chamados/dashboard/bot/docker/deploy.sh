#!/bin/sh
set -eu

test "$APP_ENV" = "$1"
test "$NODE_ENV" = production
: "${BOT_API_TOKEN:?}" "${BOT_SESSION_KEY:?}"
export APP_NAME=chamados_bot DEPLOY_ENV="$2"
STACK_NAME="${APP_NAME}_${DEPLOY_ENV}"
DEPLOY_NODE_ID="$(docker node inspect self --format '{{.ID}}')"
APP_REVISION="$(git rev-parse --short=12 HEAD)"
export DEPLOY_NODE_ID APP_REVISION STACK_NAME
export APP_IMAGE="azuos/chamados-bot:$DEPLOY_ENV-$APP_REVISION"
export BUILDX_CONFIG=/etc/komodo/buildx BUILDX_BUILDER=azuos-local
docker stack config -c docker/compose.yml >/dev/null
docker buildx build --load -f docker/dockerfile -t "$APP_IMAGE" .
docker stack deploy --detach=false --resolve-image never -c docker/compose.yml "$STACK_NAME"
