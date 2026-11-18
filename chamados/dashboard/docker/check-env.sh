#!/bin/sh
# Confere as variáveis do Infisical antes do deploy (pre-deploy de docker/komodo.sh).
set -eu

test "${APP_ENV:-}" = "$DEPLOY_ENV" || {
  echo "ERRO: APP_ENV ('${APP_ENV:-}') diferente do esperado ('$DEPLOY_ENV')" >&2
  exit 1
}
test "${NODE_ENV:-}" = "production" || {
  echo "ERRO: NODE_ENV ('${NODE_ENV:-}') deve ser 'production'" >&2
  exit 1
}
: "${PUBLIC_DOMAIN:?PUBLIC_DOMAIN obrigatório}" "${DEPLOY_DOMAIN:?DEPLOY_DOMAIN obrigatório}"
test "$PUBLIC_DOMAIN" = "chamados.$DEPLOY_DOMAIN" || {
  echo "ERRO: PUBLIC_DOMAIN ('$PUBLIC_DOMAIN') deve ser 'chamados.$DEPLOY_DOMAIN'" >&2
  exit 1
}
: "${DATABASE_URL:?DATABASE_URL obrigatório}" "${VALKEY_URL:?VALKEY_URL obrigatório}" "${DATABASE_MIGRATION_URL:?DATABASE_MIGRATION_URL obrigatório}" "${DEPLOY_DOMAIN:?DEPLOY_DOMAIN obrigatório}" "${APP_EDGE_VPN_IP:?APP_EDGE_VPN_IP obrigatório}"
