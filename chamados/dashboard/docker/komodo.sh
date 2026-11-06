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
#
# Nomes: o stack é `<ambiente>_<app>` (homo_template) e o Docker completa os serviços com
# `_<serviço>` (homo_template_app). É o mesmo nome dos recursos no Komodo.
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
STACK_NAME="${DEPLOY_ENV}_${APP_NAME}"
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

# Nomes anteriores ao padrão <ambiente>_<app>: contabil-homo e contabil_homo. Saem do Caddy e do
# Swarm só depois que o stack novo subiu (post-deploy). Apagar quando todos os apps migrarem.
LEGACY_STACK_NAMES="$APP_NAME-$DEPLOY_ENV $(printf '%s' "$APP_NAME" | tr - _)_$DEPLOY_ENV"

remove_legacy_stacks() {
  for legacy in $LEGACY_STACK_NAMES; do
    docker exec caddy rm -f "/etc/caddy/conf.d/$legacy.caddy"
    docker stack rm "$legacy" >/dev/null 2>&1 || true
  done
}

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
      with_secrets sh docker/route.sh
    fi
    remove_legacy_stacks
    ;;

  *)
    echo "Etapa inválida: $step" >&2
    exit 1
    ;;
esac
