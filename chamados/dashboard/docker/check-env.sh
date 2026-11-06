#!/bin/sh
# Confere as variáveis do Infisical antes do deploy (pre-deploy de docker/komodo.sh).
set -eu

test "$APP_ENV" = "$DEPLOY_ENV"
test "$NODE_ENV" = production
: "${PUBLIC_DOMAIN:?}" "${DEPLOY_DOMAIN:?}"
test "$PUBLIC_DOMAIN" = "chamados.$DEPLOY_DOMAIN"
: "${DATABASE_URL:?}" "${VALKEY_URL:?}" "${DATABASE_MIGRATION_URL:?}" "${DEPLOY_DOMAIN:?}" "${APP_EDGE_VPN_IP:?}"
test "$VALKEY_KEY_PREFIX" = "chamados:$APP_ENV:"
