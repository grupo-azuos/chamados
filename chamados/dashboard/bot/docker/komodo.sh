#!/bin/sh
# Etapas do deploy chamadas pelo Stack do Komodo (ver .komodo/komodo.toml). Igual em todos os
# apps; a base é o template.
#
#   sh docker/komodo.sh pre-deploy  <app> <prod|homo>            ambiente e migrações
#   sh docker/komodo.sh deploy      <app> <prod|homo> <comando>  comando `docker stack` do Komodo
#   sh docker/komodo.sh post-deploy <app> <prod|homo>            rota no Caddy de borda
#
# O Komodo passa INFISICAL_TOKEN, INFISICAL_DOMAIN e INFISICAL_PROJECT_ID. A imagem do app vem do
# Build do Komodo, com a tag `<hash curto do commit>-<ambiente>`.
set -eu

step="${1:?Informe a etapa: pre-deploy, deploy ou post-deploy}"
APP_NAME="${2:?Informe o nome do app}"
DEPLOY_ENV="${3:?Informe o ambiente: prod ou homo}"
shift 3

case "$DEPLOY_ENV" in
  prod | homo) ;;
  *)
    echo "Ambiente inválido: $DEPLOY_ENV" >&2
    exit 1
    ;;
esac

RUNTIME_DIR="$(git rev-parse --show-toplevel)/.komodo/runtime"
APP_REVISION="$(git rev-parse --short HEAD)"
APP_IMAGE="azuos/$APP_NAME:$APP_REVISION-$DEPLOY_ENV"
STACK_NAME="$APP_NAME-$DEPLOY_ENV"
DEPLOY_NODE_ID="$(docker node inspect self --format '{{.ID}}')"
export APP_NAME DEPLOY_ENV APP_REVISION APP_IMAGE STACK_NAME DEPLOY_NODE_ID

# Imagens auxiliares, construídas uma vez por host e reaproveitadas por todos os apps.
build_runtime_images() {
  docker image inspect azuos-deploy-tools:1 >/dev/null 2>&1 \
    || docker build --tag azuos-deploy-tools:1 "$RUNTIME_DIR/deploy-tools"
  docker image inspect azuos-gateway:2.11 >/dev/null 2>&1 \
    || docker build --tag azuos-gateway:2.11 "$RUNTIME_DIR/gateway"
}

# Roda o comando com os segredos do Infisical do app e do ambiente.
with_secrets() {
  : "${INFISICAL_TOKEN:?}" "${INFISICAL_DOMAIN:?}" "${INFISICAL_PROJECT_ID:?}"

  docker run --rm \
    --security-opt label=disable \
    --network host \
    --env INFISICAL_TOKEN \
    --env INFISICAL_DOMAIN \
    --env APP_NAME \
    --env DEPLOY_ENV \
    --env APP_REVISION \
    --env APP_IMAGE \
    --env STACK_NAME \
    --env DEPLOY_NODE_ID \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$PWD:$PWD:ro,z" \
    --workdir "$PWD" \
    azuos-deploy-tools:1 \
    infisical run --silent --expand=false --secret-overriding=false \
    --projectId="$INFISICAL_PROJECT_ID" --env="$DEPLOY_ENV" --path=/ \
    -- "$@"
}

# Nomes antigos em snake_case (contabil_homo). Sai depois que todos os apps migrarem.
LEGACY_STACK_NAME="$(printf '%s' "$STACK_NAME" | tr - _)"

case "$step" in
  pre-deploy)
    build_runtime_images
    with_secrets sh docker/check-env.sh
    if [ -f docker/migrate.sh ]; then
      with_secrets sh docker/migrate.sh
    fi
    ;;

  deploy)
    # O Komodo lê o compose com `docker stack config` e guarda a saída: sem segredos nela.
    case "$*" in
      "docker stack config "*) exec "$@" --skip-interpolation ;;
    esac
    with_secrets "$@"
    ;;

  post-deploy)
    if [ -f docker/route.sh ]; then
      docker exec caddy rm -f "/etc/caddy/conf.d/$LEGACY_STACK_NAME.caddy"
      with_secrets sh docker/route.sh
    fi
    docker stack rm "$LEGACY_STACK_NAME" >/dev/null 2>&1 || true
    ;;

  *)
    echo "Etapa inválida: $step" >&2
    exit 1
    ;;
esac
