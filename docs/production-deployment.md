# Deploy de chamados

Paths relativos à raiz deste repositório:

- `.komodo/komodo.toml`: Resource Sync, fora de `docker/` e do pacote interno.
- `chamados/dashboard/docker/dockerfile`: build local, com nome minúsculo e sem sufixo.
- `chamados/dashboard/docker/compose.yml`: serviços e redes da stack.
- `chamados/dashboard/docker/caddy/caddyfile`: gateway Caddy dentro de `docker/`.
- `chamados/dashboard/docker/deploy.sh`: comando executado pelo Komodo, com diretório de trabalho `chamados/dashboard`.

Importar `.komodo/komodo.toml` no Resource Sync, preencher IDs/slugs reais e Secrets de bootstrap existentes. Webhooks começam desativados para revisão.

O Komodo busca Prod/main/core ou Homo/develop/homo, injeta Infisical no TOML e chama `sh docker/deploy.sh`. A aplicação não busca segredos. O build é local, com imagem por revisão Git. Não há registry de aplicações, build de produção ou deploy no GitHub Actions.

Swarm faz update start-first, healthcheck e rollback automático. Caddy aponta ao gateway estável. Não há controlador Python, troca de slots ou estado próprio. Workers e bot usam stop-first com uma réplica. WebSockets/SSE podem reconectar; Chamados mantém uma réplica web enquanto o estado do agente for local.

O job de migration recebe somente a conexão direta e a CA. Mantém trava e journals existentes; SQL precisa aceitar a versão anterior. Rollback do serviço não desfaz banco. Nos apps, as redes são privadas e só o gateway participa da borda.

Preencher no Infisical `chamados/dashboard/docker/.env.example` e o contrato do server. Prod: APP_ENV=prod, DEPLOY_DOMAIN=grupoazuos.com.br e borda VPN do core. Homo: APP_ENV=homo, DEPLOY_DOMAIN=homo.grupoazuos.com.br e borda VPN do ops. Dados, cookies e chaves de Homo não usam os serviços de Prod.

Referências: `server/configuration/servers/v1.0.1/README.md` e `server/configuration/apps/app-runtime/README.md`. Testar a integração com develop antes de publicar PR; testar uma branch de main não valida as features exclusivas de develop.

O bot tem contexto separado em `chamados/dashboard/bot/docker/dockerfile`, stack em `chamados/dashboard/bot/docker/compose.yml` e comando em `chamados/dashboard/bot/docker/deploy.sh`. Os recursos do bot usam o mesmo `.komodo/komodo.toml` da raiz.
