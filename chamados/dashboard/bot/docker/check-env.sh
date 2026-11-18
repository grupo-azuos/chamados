#!/bin/sh
# Confere as variáveis do Infisical antes do deploy (pre-deploy de docker/komodo.sh).
set -eu

test "$APP_ENV" = "$DEPLOY_ENV"
test "$NODE_ENV" = production
: "${BOT_API_TOKEN:?}" "${BOT_SESSION_KEY:?}"
