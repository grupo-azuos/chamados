#!/bin/sh
set -eu

deploy_env="${1:?Use prod ou homo}"
docker service rollback --detach=false "chamados-${deploy_env}_app"
docker service rollback --detach=false "chamados-${deploy_env}_worker"
docker service rollback --detach=false "chamados-${deploy_env}_gateway"
