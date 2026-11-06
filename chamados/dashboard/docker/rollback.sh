#!/bin/sh
# Volta todos os serviços do stack <ambiente>_<app> para a versão anterior (rollback do Swarm).
# É o mesmo comando da Action <ambiente>_<app>_rollback do Komodo.
set -eu

deploy_env="${1:?Use prod ou homo}"
docker service ls -q --filter "label=com.docker.stack.namespace=${deploy_env}_chamados" \
  | xargs -r -n1 docker service rollback --detach=false
