#!/bin/sh
set -eu

test "$APP_ENV" = "$1"
test "$NODE_ENV" = production
: "${PUBLIC_DOMAIN:?}" "${DEPLOY_DOMAIN:?}"
test "$PUBLIC_DOMAIN" = "chamados.$DEPLOY_DOMAIN"
: "${DATABASE_URL:?}" "${VALKEY_URL:?}" "${DATABASE_MIGRATION_URL:?}" "${DEPLOY_DOMAIN:?}" "${APP_EDGE_VPN_IP:?}"
test "$VALKEY_KEY_PREFIX" = "chamados:$APP_ENV:"

export APP_NAME=chamados DEPLOY_ENV="$2"
STACK_NAME="${APP_NAME}_${DEPLOY_ENV}"
DEPLOY_NODE_ID="$(docker node inspect self --format '{{.ID}}')"
APP_REVISION="$(git rev-parse --short=12 HEAD)"
export DEPLOY_NODE_ID APP_REVISION STACK_NAME
export APP_IMAGE="azuos/chamados:$DEPLOY_ENV-$APP_REVISION"
export BUILDX_CONFIG=/etc/komodo/buildx BUILDX_BUILDER=azuos-local

docker stack config -c docker/compose.yml >/dev/null
sh docker/build.sh
sh docker/migrate.sh
docker stack deploy --detach=false --resolve-image never -c docker/compose.yml "$STACK_NAME"

# Publicar rota do app no Caddy de borda
docker exec -i caddy sh -c "cat > /etc/caddy/conf.d/${STACK_NAME}.caddy" <<EOF
${PUBLIC_DOMAIN} {
	reverse_proxy ${STACK_NAME}_gateway:8080
}
EOF
docker exec caddy caddy validate --config /etc/caddy/caddyfile --adapter caddyfile >/dev/null
docker exec caddy caddy reload --config /etc/caddy/caddyfile --adapter caddyfile
