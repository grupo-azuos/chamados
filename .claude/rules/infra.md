# Regras de Infraestrutura (Grupo Azuos)

Valem para todos os apps com `.komodo/komodo.toml`. A base é o `template`: mudou aqui, muda em
todos. O `scripts/infra-contract.mjs` confere estas regras no hook do Claude (a cada edição) e no
CI; violação não se contorna, corrige-se.

## 1. Nomes

| O quê                                              | Padrão                                                          | Exemplo                                                |
| -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Ambiente                                           | `homo` (develop, servidor homo) ou `prod` (main, servidor core) | `homo`                                                 |
| Recursos do Komodo (Repo, Build, Stack, Procedure) | `<ambiente>_<app>`                                              | `homo_admin-console`                                   |
| Action do Komodo                                   | `<ambiente>_<app>_<ação>`                                       | `homo_admin-console_rollback`                          |
| Stack do Swarm                                     | `<ambiente>_<app>` (igual ao recurso)                           | `homo_admin-console`                                   |
| Serviço / container                                | o Docker completa: `<stack>_<serviço>`                          | `homo_admin-console_app`, `homo_admin-console_gateway` |
| Imagem                                             | `azuos/<app>:<hash>-<ambiente>` (tag do Build do Komodo)        | `azuos/admin-console:a1b2c3d-homo`                     |
| Config do gateway                                  | `<ambiente>_<app>_gateway_<hash>`                               | `homo_admin-console_gateway_a1b2c3d`                   |
| Rota no Caddy de borda                             | `conf.d/<ambiente>_<app>.caddy`                                 | `conf.d/homo_admin-console.caddy`                      |
| Namespace do Valkey                                | `<app>:<ambiente>`                                              | `admin-console:homo`                                   |
| Banco PostgreSQL                                   | snake_case, **não muda**                                        | `admin_console`                                        |

- `_` separa os níveis (ambiente, app, serviço); `-` só junta palavras dentro do nome do app.
- O app é sempre kebab-case. Nada de maiúscula, `.` ou `:` em nome de stack, serviço, rede ou volume.
- O banco não segue esta tabela: nomes de banco, schema, tabela e coluna continuam em snake_case.

## 2. Komodo: tudo declarado no `.komodo/komodo.toml`

Por ambiente, cinco recursos, todos com `description` e as tags
`["context:apps", "env:<ambiente>", "server:<homo|core>"]`:

1. **Repo** — clone da branch do ambiente no servidor do ambiente.
2. **Build** — `linked_repo` no Repo, builder do ambiente (`homo` ou `prod`), `image_tag` = ambiente,
   só `include_commit_tag`, labels `azuos.app` e `azuos.environment`.
3. **Stack** — `linked_repo` no Repo, Swarm do ambiente (`homo` ou `core`), `project_name` igual
   ao nome, etapas em `docker/komodo.sh`.
4. **Procedure** — estágios `Pull` (PullRepo) → `Build` (RunBuild) → `Deploy` (DeployStack).
5. **Action** `<ambiente>_<app>_rollback` — rollback nativo do Swarm.

Webhook do GitHub só na Procedure (`webhook_enabled = true`); Repo, Build, Stack e Action ficam com
`webhook_enabled = false`. Cada repo do GitHub tem dois webhooks por ambiente: o do Sync
(`/listener/github/sync/<sync>/sync`) e o da Procedure (`/listener/github/procedure/<ambiente>_<app>/<branch>`).

## 3. Build e imagem

- Server empacotado pelo **Rspack** (`rspack build`), client pelo **Rsbuild** (`rsbuild build`).
  Testes continuam no Vitest. Exceção: client em **SvelteKit** continua no Vite, porque o SvelteKit
  só existe sobre o Vite.
- A imagem final **não copia `node_modules`**: leva o pacote do server, as migrations e o client.
  Módulo nativo (`.node`) que não entra no pacote é copiado um por um, com comentário.
- Sem registry, GHCR, `docker push` ou build/deploy no GitHub Actions. O Komodo constrói no
  servidor do ambiente.

## 4. Ambiente e segredos

- **Não criar variável de ambiente nova** para resolver infra: nomes, prefixos e namespaces saem
  de `APP_NAME` e `DEPLOY_ENV`, que o `docker/komodo.sh` já calcula.
- Segredo só no Infisical, injetado nas etapas de `docker/komodo.sh`. O app, o dockerfile e o
  entrypoint nunca buscam segredo.

## 5. Pastas e arquivos

- Tudo do agente fica em `.claude/` (skills, hooks, regras, comandos). Não existe `.agents/`.
- `dockerfile`, `compose.yml`, `caddyfile` e scripts `.sh` em minúsculas; `.sh` passam no
  `shellcheck -s sh` e no `shfmt -i 2 -ci -bn`.

## 6. Versão e tag (skill `release-standard`)

- A versão é **uma só**, semântica (`X.Y.Z`), e mora em três lugares que andam juntos: os
  `package.json` (e o lock), cada `[build.config]` do Komodo (`version = "X.Y.Z"`,
  `auto_increment_version = false`, label `azuos.version=X.Y.Z`) e a tag anotada `prod/vX.Y.Z`
  na `main`. O server a devolve no cabeçalho `API-Version` e em `GET /api/health`; o
  `docker/komodo.sh` a exporta como `APP_VERSION` e o `compose.yml` a grava no label
  `azuos.version` do serviço.
- Quem grava tudo é o **`scripts/release.mjs`** (`npm run release -- X.Y.Z --notes "…"`): commit
  `[chore](release): Versão X.Y.Z` na develop, `[merge](release): vX.Y.Z na main` por `--no-ff`
  num worktree, tag e envio. Versão nova **nasce na develop e vai para a main**; nunca o
  contrário, e nunca à mão.
- A mensagem da tag é `<Sistema> X.Y.Z: o que mudou.`, uma linha em branco e `Canal: prod.`.
- **Nenhuma outra tag** sai da máquina: o `scripts/git/release-guard.sh` (pre-push, vale também para
  quem administra) recusa `v*`, tag leve, mensagem fora do padrão, commit com versão diferente nos
  arquivos e commit fora da main. Artefato com tag própria (o agente do chamados) é exceção
  declarada em `EXTRA_TAG_PATTERNS`.
- Não existe bump por Action no GitHub: o `Release/Bump` foi removido e o `infra-contract` reprova
  se ele voltar.
