---
name: release-standard
description: O PADRÃO DE VERSÃO E TAG do Grupo Azuos — toda versão nova nasce na develop com a versão gravada nos package.json, no package-lock.json e no Build do Komodo, vai para a main por merge --no-ff e vira a tag anotada `prod/vX.Y.Z` com a mensagem "<Sistema> X.Y.Z: o que mudou." e "Canal: prod.". O `npm run release` faz tudo de uma vez e o hook de pre-push recusa qualquer tag fora disso. Use SEMPRE que a pessoa pedir versão nova, release, tag, "sobe para produção", "manda para a main", "gera a tag", hotfix, ou perguntar qual é a versão atual. Só quem administra lança versão.
---

# Versão e tag (padrão do grupo)

A versão de um sistema é **uma só** e mora em três lugares que andam juntos: os `package.json`
(e o lock), o Build do Komodo (`version` e o label `azuos.version`) e a tag `prod/vX.Y.Z` na
main. O server devolve essa versão no cabeçalho `API-Version` e em `GET /api/health`. Nenhum
desses lugares muda sozinho: o `scripts/release.mjs` grava todos, e a trava
`scripts/git/release-guard.sh` (pre-push) recusa a tag cujo commit não esteja com a versão
igual em todos. A regra está em `.claude/rules/infra.md` §6 e o `scripts/infra-contract.mjs`
confere a ligação.

## Quem pode

Só **quem administra** (`git config azuos.admin true`). No Modo Padrão, explique que versão
nova é com quem administra e pare. Mesmo em Modo Admin, a identidade dos commits
(`participant-identity`) e esta trava não se desligam.

## O que é versão nova

Semântico, sem sufixo:

| Mudou                                                  | Sobe  | Exemplo         |
| ------------------------------------------------------ | ----- | --------------- |
| Correção, ajuste de tela, texto                        | patch | 1.2.3 → 1.2.4   |
| Funcionalidade nova, tela nova                         | minor | 1.2.3 → 1.3.0   |
| Contrato quebrado (campo removido, API `/v2`, migração) | major | 1.2.3 → 2.0.0   |

A versão atual: `npm run release -- --current` (o maior `version` dos `package.json`). As tags
existentes: `git tag -l 'prod/v*' -n3`.

## O fluxo (o script faz tudo)

Da pasta do app, na `develop` limpa e igual à `origin/develop`:

```bash
npm run release -- 1.3.0 \
  --notes "o chamado manda itens do estoque para o descarte e cadastra item no depósito" \
  --trailer "Participant-Id: p-…" --trailer "Participant-Role: technical" \
  --trailer "AI-Tool: Claude Code" --trailer "Co-Authored-By: …"
```

O que acontece, nesta ordem, e para em qualquer recusa sem deixar nada pela metade:

1. **Versão nos arquivos, na develop**: todos os `package.json`, os `package-lock.json` e cada
   `[build.config]` do `.komodo/komodo.toml` (`version = "1.3.0"`,
   `auto_increment_version = false`, label `azuos.version=1.3.0`). Commit
   `[chore](release): Versão 1.3.0`, com os trailers de identificação. Envia a develop.
2. **Develop na main**, num worktree temporário (a pasta de trabalho nunca troca de branch):
   `git merge --no-ff -m "[merge](release): v1.3.0 na main" develop`.
3. **Tag anotada na main**: `prod/v1.3.0`, com a mensagem

   ```
   <Sistema> 1.3.0: o que mudou.

   Canal: prod.
   ```

   O nome do sistema é o da aba do navegador (`<title>` do `index.html`, skill
   `rename-project`); `--system "Nome"` sobrescreve. Primeira versão: `--notes "Primeira
   versão de produção do <Sistema>: …"`.
4. **Envio** de main e tag. O pre-push confere a tag; a Procedure `prod_<app>` do Komodo publica.

Depois, diga à pessoa: a versão, o que entrou, e que o Komodo está publicando.

## Hotfix

Correção urgente que não pode esperar a develop: branch `hotfix/<nome>` a partir de `origin/main`,
num worktree; corrige, confere, `git merge --no-ff` na main **e** na develop; depois
`npm run release -- X.Y.(Z+1) --notes "…"` na develop normalmente. A tag continua nascendo só pelo
script, com a develop e a main iguais na versão.

## O que a trava recusa (e não se contorna)

- Tag que não seja `prod/vX.Y.Z` — `v1.0.0`, `1.0.0`, `release-1.0.0`, `dashboard/v1.0.0`.
  Artefato com tag própria (o agente do chamados) é exceção declarada em `EXTRA_TAG_PATTERNS`
  do `release-guard.sh`, nunca improvisada.
- Tag leve (`git tag` sem `-a`) ou com mensagem fora do padrão.
- Tag cujo commit tenha `package.json` ou Komodo em outra versão.
- Tag em commit fora da main.

Se a trava recusar, o caminho é rodar o `npm run release`, nunca `--no-verify`.

## Nunca

- Criar a tag à mão ou editar a versão só num arquivo.
- Tag em outro formato "porque o deploy precisa". O Komodo lê a versão do `komodo.toml` e do
  commit; não precisa de outra tag.
- Rodar o release com a develop diferente da `origin/develop`, ou com alteração sem commit.
- Reescrever uma tag já enviada. Errou a versão? Lança a seguinte.
