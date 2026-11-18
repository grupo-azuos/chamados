---
name: rename-project
description: Coloca o nome do MVP onde as pessoas o veem — título da aba do navegador, título da documentação da API, título e descrição do README e dos pacotes. Não renomeia pastas nem pacotes internos. Use quando a pessoa pede para "dar nome ao projeto", "trocar o nome template" ou logo depois de criar um repositório a partir do template.
---

# Dar nome ao MVP

**Só os nomes visíveis mudam.** A pasta `chamados/dashboard/` e o pacote interno `@chamados/dashboard/shared`
continuam com esses nomes: eles não aparecem para quem usa o sistema, e trocá-los mexe na
estrutura protegida do projeto (hooks, CI, regras) — isso é do suporte.

O nome do repositório no GitHub já é o nome do MVP; é por ele que as pessoas o reconhecem.

## 1. O nome

Pergunte, se ela ainda não disse, e confirme como vai aparecer: `Gestão de Frota`.

## 2. Branch

`git-flow`, Fase 1: `feature/project-name`.

## 3. Trocar

Caminhos a partir da raiz do repositório:

| Onde | De | Para |
|---|---|---|
| `chamados/dashboard/client/index.html` | `<title>Template · Grupo Azuos</title>` | `<title><Nome> · Grupo Azuos</title>` |
| `chamados/dashboard/server/src/main.ts` | `.setTitle('Template')` | `.setTitle('<Nome>')` |
| `chamados/dashboard/server/src/main.ts` | `'API do MVP.'` | `'API do <Nome>.'` |
| `README.md` | `# Template de MVP · Grupo Azuos` e o primeiro parágrafo | `# <Nome>` e uma ou duas frases do que o MVP faz, na voz da pessoa |
| `chamados/dashboard/package.json` | `"description"` | uma frase do MVP |

Não mexa em `CLAUDE.md`, `CONTRIBUTING.md`, `SUPORTE.md`, `.claude/`, `.github/`, hooks nem
configurações — são protegidos e não carregam o nome do MVP.

## 4. Verificar e terminar

```bash
cd template
npm run lint && npm run typecheck && npm test
```

Suba o sistema e mostre a aba do navegador com o nome novo. Depois `git-commit`
(`[chore](web): Nome do MVP no título das telas`, e `[docs](docs): …` para o README) e
`git-flow` Fases 3 e 4, com o OK da pessoa antes de juntar na develop.
