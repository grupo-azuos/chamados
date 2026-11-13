#!/bin/sh
# Cria a rede que a API divide com o bot (stack separado, ver bot/docker/compose.yml). Os dois
# compose a declaram `external`, então nenhum stack a cria; quem subir primeiro garante que existe.
# Mesmo comando do app-runtime do Ansible.
set -eu

network="chamados-${DEPLOY_ENV:?}-integrations"

docker network inspect "$network" >/dev/null 2>&1 \
  || docker network create --driver overlay --attachable --opt encrypted "$network" >/dev/null
