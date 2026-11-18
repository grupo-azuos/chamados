# Deploy de chamados

Paths relativos à raiz deste repositório:

- `.komodo/komodo.toml`: Resource Sync, fora de `docker/` e do pacote interno.
- `chamados/dashboard/docker/dockerfile`: build local, com nome minúsculo e sem sufixo.
- `chamados/dashboard/docker/compose.yml`: serviços e redes da stack.
- `chamados/dashboard/docker/caddy/caddyfile`: gateway Caddy dentro de `docker/`.
- `chamados/dashboard/docker/komodo.sh`: etapas chamadas pelo Stack do Komodo (pre-deploy, deploy e post-deploy).
- `chamados/dashboard/docker/check-env.sh`, `migrate.sh` e `route.sh`: conferência do ambiente, migração e rota no Caddy.

Importar `.komodo/komodo.toml` no Resource Sync, preencher IDs/slugs reais e Secrets de bootstrap existentes. Só a Procedure recebe webhook; Build e Stack ficam com o webhook desligado.

O Resource Sync cria, para cada ambiente, um Build, um Stack e uma Procedure com o mesmo nome (`<app>-prod`, `<app>-homo`). O webhook do GitHub chama a Procedure (`/listener/github/procedure/<app>-<ambiente>/<branch>`), que roda o Build e depois o Deploy Stack. O Build gera a imagem local `azuos/<app>:<hash>-<ambiente>`, sem registry. O Stack chama `docker/komodo.sh` antes do deploy (`check-env.sh` e `migrate.sh`), no deploy (Infisical em volta do `docker stack deploy`) e depois dele (`route.sh` no Caddy). A aplicação não busca segredos. Não há registry de aplicações, build de produção ou deploy no GitHub Actions.

Swarm faz update start-first, healthcheck e rollback automático. Caddy aponta ao gateway estável. Não há controlador Python, troca de slots ou estado próprio. Workers e bot usam stop-first com uma réplica. WebSockets/SSE podem reconectar; Chamados mantém uma réplica web enquanto o estado do agente for local.

O job de migration recebe somente a conexão direta e a CA. Mantém trava e journals existentes; SQL precisa aceitar a versão anterior. Rollback do serviço não desfaz banco. Nos apps, as redes são privadas e só o gateway participa da borda.

Preencher no Infisical `chamados/dashboard/docker/.env.example` e o contrato do server. Prod: APP_ENV=prod, DEPLOY_DOMAIN=grupoazuos.com.br e borda VPN do core. Homo: APP_ENV=homo, DEPLOY_DOMAIN=homo.grupoazuos.com.br e borda VPN do ops. Dados, cookies e chaves de Homo não usam os serviços de Prod.

Referências: `server/configuration/servers/v1.0.1/README.md` e `server/configuration/apps/app-runtime/README.md`. Testar a integração com develop antes de publicar PR; testar uma branch de main não valida as features exclusivas de develop.

O bot tem contexto separado em `chamados/dashboard/bot/docker/dockerfile`, stack em `chamados/dashboard/bot/docker/compose.yml` e etapas em `chamados/dashboard/bot/docker/komodo.sh` (Build, Stack e Procedure `chamados-bot-<ambiente>`). Os recursos do bot usam o mesmo `.komodo/komodo.toml` da raiz.
