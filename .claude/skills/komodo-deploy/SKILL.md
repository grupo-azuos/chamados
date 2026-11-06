---
name: komodo-deploy
description: Gera ou corrige o deploy no Komodo de um app do Grupo Azuos — `.komodo/komodo.toml` com Repo, Build, Stack, Procedure e Action por ambiente no padrão `<ambiente>_<app>`, e os scripts `docker/komodo.sh`, `check-env.sh`, `route.sh`, `migrate.sh` e `rollback.sh`. Use ao promover um app para Homo/Prod, ao criar um app novo a partir do template, ao configurar webhooks do GitHub ou quando o deploy de um app divergir do template. Não concede autorização para deploy, merge ou push.
---

# Deploy no Komodo (padrão do template)

As regras estão em `.claude/rules/infra.md` e o `scripts/infra-contract.mjs` reprova o que foge
delas. Esta skill é o passo a passo.

O deploy é **igual em todos os apps**: copie o `.komodo/komodo.toml` e o `docker/` do template e
troque só o que é do app. Se um app precisa de algo diferente, mude o template primeiro.

## O que muda de um app para outro

| Valor                            | Exemplo                           | Onde                                                                             |
| -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Nome do app (kebab-case)         | `contabil`                        | nomes `<ambiente>_<app>`, `image_name`, labels, links, argumentos de `komodo.sh` |
| Pasta do app no repositório      | `template`                        | `build_path` e `run_directory`                                                   |
| Repositório no GitHub            | `grupo-azuos/contabil`            | `repo` e links do Repo                                                           |
| Variável do projeto no Infisical | `CONTABIL_INFISICAL_PROJECT_ID`   | os três comandos do Stack                                                        |
| Domínio                          | `contabil.homo.grupoazuos.com.br` | `links` do Build e do Stack, `check-env.sh`                                      |
| Serviços extras (bot, worker)    | `chamados` tem o bot              | Build `<ambiente>_<app>_<serviço>` e estágio Build da Procedure                  |

## Recursos por ambiente

|                    | homo                                      | prod                                      |
| ------------------ | ----------------------------------------- | ----------------------------------------- |
| Branch             | `develop`                                 | `main`                                    |
| Servidor do Repo   | `homo`                                    | `core`                                    |
| Builder            | `homo`                                    | `prod`                                    |
| Swarm              | `homo`                                    | `core-prod`                               |
| Token do Infisical | `INFISICAL_HOMO_TOKEN`                    | `INFISICAL_PROD_TOKEN`                    |
| Tags               | `context:apps`, `env:homo`, `server:homo` | `context:apps`, `env:prod`, `server:core` |

Para cada ambiente, nesta ordem no arquivo:

1. `[[repo]] <ambiente>_<app>` — `server`, `repo`, `branch`, `links` para a árvore no GitHub.
2. `[[build]] <ambiente>_<app>` — `builder`, `linked_repo = "<ambiente>_<app>"`, `build_path`,
   `dockerfile_path = "docker/dockerfile"`, `image_name = "azuos/<app>"`, `image_tag = "<ambiente>"`,
   só `include_commit_tag = true`, `labels` (`org.opencontainers.image.source`, `azuos.app`,
   `azuos.environment`) e `links` para o domínio.
3. `[[stack]] <ambiente>_<app>` — `swarm`, `project_name = "<ambiente>_<app>"`, `linked_repo`,
   `run_directory`, `file_paths = ["docker/compose.yml"]`,
   `extra_args = ["--resolve-image", "never", "--detach=false"]`,
   `compose_cmd_wrapper_include = ["config", "deploy"]` e os três comandos chamando
   `sh docker/komodo.sh <etapa> <app> <ambiente>`.
4. `[[procedure]] <ambiente>_<app>` — `webhook_enabled = true`, estágios `Pull` (PullRepo),
   `Build` (RunBuild) e `Deploy` (DeployStack).
5. `[[action]] <ambiente>_<app>_rollback` — `execute_server_terminal` no servidor do ambiente com o
   rollback dos serviços do stack (cópia do template).

Todo recurso tem `description` (o que ele faz, em português) e as três tags. Só a Procedure tem
webhook ligado.

Comandos longos no TOML usam string literal (`'''`) e quebram linha com ` \` (espaço antes da
barra). Segredos e variáveis do Komodo entram como `'[[NOME]]'`.

## Webhooks no GitHub (por ambiente)

| Webhook                       | URL                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Sync (aplica o `komodo.toml`) | `https://komodo.grupoazuos.com.br/listener/github/sync/<id ou nome do sync>/sync`      |
| Procedure (publica o app)     | `https://komodo.grupoazuos.com.br/listener/github/procedure/<ambiente>_<app>/<branch>` |

Content type `application/json`, evento **push**, Secret = `komodo_webhook_secret` do server.
Build e Stack não têm webhook: quem chama os dois, em ordem, é a Procedure.

## Scripts em `docker/`

- `komodo.sh` — cópia exata do template. `STACK_NAME="${DEPLOY_ENV}_${APP_NAME}"`, imagem
  `azuos/<app>:<hash>-<ambiente>`, constrói `azuos-deploy-tools` e `azuos-gateway` uma vez por
  host, roda as etapas dentro de `infisical run` e, no post-deploy, remove rotas e stacks com os
  nomes antigos (`<app>-<ambiente>`, `<app_snake>_<ambiente>`).
- `check-env.sh` — só conferências (`test`, `: "${VAR:?}"`).
- `migrate.sh` — job de migration (`<stack>_migration`); só em app com banco.
- `route.sh` — grava `conf.d/${STACK_NAME}.caddy` no Caddy de borda; só em app com rota.
- `rollback.sh` — mesmo comando da Action de rollback, para uso manual.

Nada de `deploy.sh`, `build.sh` ou `on_pull`: Repo, Build, Stack e Procedure fazem esse papel.

## Conferir antes do commit

```sh
node scripts/infra-contract.mjs
node --test scripts/infra-contract.test.mjs
shellcheck -s sh <app>/docker/*.sh && shfmt -i 2 -ci -bn -d <app>/docker/*.sh
```
