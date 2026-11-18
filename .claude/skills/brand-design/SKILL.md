---
name: brand-design
description: Identidade visual de Azuos — padrão Cupertino, paleta Oficial Azuos, tipografia IBM Plex Sans + Plex Mono, tokens de cor e o que é proibido (cor crua, preto e branco puros). Use ANTES de criar ou mudar qualquer tela, componente, cor, espaçamento ou estilo, e ao revisar se uma tela segue a marca.
---

# Design de Azuos

Esta skill é a **fonte da verdade visual**. A skill `ux-laws` diz como a tela se comporta
(tamanho de alvo, quantidade de opções, agrupamento); aqui está **como ela parece**. Um hook
confere cada arquivo editado (§7): violação de nível erro volta para você corrigir na hora.

Antes de escrever qualquer tela, responda:

1. **A cor vem de um token?** (§2) Nunca hex, rgb ou paleta padrão do Tailwind.
2. **A forma segue o padrão Cupertino?** (§3: raio por papel, borda, sombra, altura)
3. **A tela respeita as leis de UX?** (skill `ux-laws`)

---

## 1. Identidade

| Papel | Escuro | Claro | Como texto (escuro / claro) |
| ----- | ------ | ----- | --------------------------- |
| **Primária** | `#4265d4` | `#1b3a8c` | `#4265d4` / `#142b69` |
| **Destaque** | `#f7ce3c` | `#f5c518` | `#f7ce3c` / `#b45309` |
| **Terceira** | `#a78bfa` | `#8b5cf6` | `#a78bfa` / `#6d28d9` |

Paleta **Oficial Azuos**, neutros **Tinta azulada**.

> Azuos Contabilidade Digital para você e sua empresa

Traga sua empresa para a melhor opção em plataforma de negócios para quem busca uma solução completa de contabilidade digital.

A marca aparece com sua logo oficial ou nome escrito, com o azul escuro e o ponto amarelo.

## 2. Tokens

Todas as cores da interface saem destes tokens. No Tailwind viram classes (`bg-primary`,
`text-muted-foreground`, `border-border`); no CSS, `var(--primary)`. O tema escuro é marcado por
`data-theme="dark"` no `<html>`.

| Token | Papel | Claro | Escuro |
| ----- | ----- | ----- | ------ |
| `background` | Fundo da página | `#f8fafc` | `#0b1220` |
| `card` | Superfície elevada (cartão, popover, diálogo) | `#fbfbfd` | `#111827` |
| `muted` | Superfície discreta (trilho, chip, tag) | `#f3f4f6` | `#1f2937` |
| `border` | Borda e divisória | `#d1d5db` | `#2b2c3d` |
| `foreground` | Texto principal | `#111827` | `#f1f5f9` |
| `muted-foreground` | Texto secundário, legenda | `#6b7280` | `#94a3b8` |
| `sidebar` | Barra lateral e cabeçalho fixo | `#1b3a8c` | `#16265c` |
| `primary` | Cor da marca cheia: ação primária (uma por tela) | `#1b3a8c` | `#4265d4` |
| `primary-foreground` | Texto sobre a cor primária | `#f8fafc` | `#f8fafc` |
| `primary-strong` | Primária como texto/link (passa AA no fundo) | `#142b69` | `#4265d4` |
| `primary-soft` | Fundo suave da primária (selo, item ativo) | `#e1e6f5` | `#16265c` |
| `accent-hero` | Destaque secundário cheio (uma coisa por vez) | `#f5c518` | `#f7ce3c` |
| `accent-hero-foreground` | Texto sobre o destaque | `#111827` | `#111827` |
| `accent-strong` | Destaque como texto (eyebrow, rótulo) | `#b45309` | `#f7ce3c` |
| `tertiary` | Terceira cor (gráficos, detalhes) | `#8b5cf6` | `#a78bfa` |
| `tertiary-strong` | Terceira cor como texto | `#6d28d9` | `#a78bfa` |
| `ring` | Anel de foco | `#2e52b8` | `#4265d4` |
| `shadow` | Cor das sombras (o tom escuro da marca, nunca preto) | `#111827` | `#060b14` |
| `success-soft` | Fundo do selo de sucesso | `#d1fae5` | `#022c22` |
| `success` | Sucesso (texto/ícone) | `#047857` | `#34d399` |
| `warning-soft` | Fundo do selo de aviso | `#fef3c7` | `#451a03` |
| `warning` | Aviso (texto/ícone) | `#b45309` | `#fbbf24` |
| `info-soft` | Fundo do selo de informação | `#dbeafe` | `#172554` |
| `info` | Informação (texto/ícone) | `#1d4ed8` | `#60a5fa` |
| `destructive-soft` | Fundo do selo de erro | `#fee2e2` | `#450a0a` |
| `destructive` | Erro e ação destrutiva | `#dc2626` | `#f87171` |
| `destructive-foreground` | Texto sobre o botão destrutivo | `#f8fafc` | `#111827` |
| `chart-1` | Série 1 de gráfico | `#2e52b8` | `#4265d4` |
| `chart-2` | Série 2 de gráfico | `#10b981` | `#34d399` |
| `chart-3` | Série 3 de gráfico | `#f5c518` | `#f7ce3c` |
| `chart-4` | Série 4 de gráfico | `#ef4444` | `#f87171` |
| `chart-5` | Série 5 de gráfico | `#8b5cf6` | `#a78bfa` |

Regras de uso:

- **`primary` cheio é raro**: uma ação primária por tela. Link e texto na cor da marca usam
  `primary-strong`, que passa no contraste.
- **`*-soft` é fundo, `*` é texto**: selo de sucesso = `bg-success-soft text-success`.
- **Texto sobre cor cheia usa o `*-foreground` dela**, nunca uma cor escolhida a olho.
- **Cor nova entra primeiro no tokens.css**, com nome de papel (`--warning`), não de cor (`--amarelo`).

## 3. Padrão: Cupertino

Cantos contínuos grandes, barra translúcida, grupos em fundo cinza sem borda e alvos de 44px.

Inspirado em **Apple Human Interface Guidelines** (https://developer.apple.com/design/human-interface-guidelines). É uma leitura livre do guia público, não a implementação
oficial: sem logo, sem fonte proprietária e com as regras desta marca por cima (alvo mínimo de
40px e sombra sem preto puro).

- Cantos grandes e contínuos (squircle onde o navegador suporta): 12px em botões, 20px em cartões.
- Grupos em fundo levemente cinza, sem borda; separação por espaço.
- Barra de navegação translúcida com desfoque.
- Alvos de toque de 44px (o mínimo do HIG). Fonte IBM Plex Sans no lugar da SF Pro.

Forma por papel (tokens `--shape-*`, no Tailwind `rounded-<papel>`):

| Papel | Raio | Classe |
|---|---|---|
| Campos | `10px` | `rounded-control` |
| Botões | `12px` | `rounded-button` |
| Cartões | `20px` | `rounded-card` |
| Diálogos | `14px` | `rounded-dialog` |
| Chips e tags | `9999px` | `rounded-chip` |
| Selos | `9999px` | `rounded-badge` |

- Controles com `44px` de altura (`h-control`, token `--control-height`).
- Campos de texto: em caixa, com borda.
- Sombra de cartão: `shadow-card` (`none`).
- Movimento: `350ms cubic-bezier(0.32, 0.72, 0, 1)` (`ease-brand`, `--motion-duration`).
- Nunca raio, sombra ou altura arbitrários (`rounded-[13px]`): use o papel certo.
- Referência de implementação: `design/reference.css` (classes `.pv-*` da prévia).

## 4. Tipografia

- Texto: `'IBM Plex Sans', system-ui, sans-serif`
- Títulos: `'IBM Plex Sans', system-ui, sans-serif`
- Escala do Tailwind (`text-sm`, `text-base`, `text-xl`…); nunca tamanho arbitrário em px.
- Corpo de texto com no mínimo 16px em formulário no celular (evita zoom automático).

## 5. Proibido

| Proibido                                                       | Por quê                                     | No lugar                                   |
| -------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| `#000`, `#fff`, `black`, `white`, `bg-black`, `text-white`     | Regra da marca: nunca preto ou branco puros | `foreground`, `background`, `*-foreground` |
| Hex, `rgb()`, `hsl()`, `oklch()` fora do tokens.css            | A cor sai da marca e não acompanha o tema   | Token                                      |
| Paleta padrão do Tailwind (`bg-blue-500`, `text-gray-600`)     | Mesma coisa                                 | Token                                      |
| Valor arbitrário de cor, raio, sombra ou fonte (`text-[13px]`) | Foge da escala                              | Classe da escala ou token novo             |
| Mais de uma ação primária na mesma tela                        | Efeito Von Restorff                         | Uma primária, o resto secundário           |

## 6. Leis de UX

- **Lei de Hick**: O tempo para decidir cresce com o número e a complexidade das opções.
- **Lei de Fitts**: O tempo para acertar um alvo depende da distância até ele e do tamanho dele.
- **Lei de Jakob**: As pessoas passam a maior parte do tempo em outros sites e esperam que o seu funcione igual.
- **Lei de Miller**: A memória de trabalho guarda poucos itens (7 ± 2) ao mesmo tempo.
- **Efeito Von Restorff**: Entre itens parecidos, o que é diferente é o que se lembra.
- **Conectividade Uniforme**: Elementos ligados visualmente (mesmo contorno, mesma linha) são percebidos como um grupo.
- **Lei de Tesler**: Toda tarefa tem uma complexidade mínima; ela deve ficar com o sistema, não com quem usa.

O detalhe, com o que exigir e o que o verificador pega, está na skill `ux-laws`.

## 7. Checagem automática

O verificador mora em `.claude/hooks/design/` (JavaScript puro, sem dependência, Node 22+):

```bash
node .claude/hooks/design/check-design.mjs            # varre o projeto (CI, pre-push)
node .claude/hooks/design/check-design.mjs --json     # o mesmo, em JSON
node --test ".claude/hooks/design/*.test.mjs"        # testes das regras e do verificador
```

- **Hook `PostToolUse`** (`.claude/settings.json`): depois de todo `Edit`/`Write`, confere o
  arquivo. Erro → você recebe a regra, a linha e a dica, e **corrige antes de seguir**. Aviso →
  chega como contexto.
- **Hook `SessionStart`**: o resumo das regras entra no contexto de toda sessão.
- Limites e leis ligadas ficam em `.claude/hooks/design/design.config.json`.

Caso justificado (raro) se silencia na linha de cima, **com o motivo**:

```html
<!-- design-ignore-next-line fitts/target-size: ícone dentro de um alvo de 40px -->
```

Nunca silencie para "fazer passar": corrija.

## 8. Antes de entregar

- [ ] `node .claude/hooks/design/check-design.mjs` sem erro.
- [ ] Tela conferida no tema claro **e** no escuro.
- [ ] Uma ação primária por tela; destaque usado uma vez.
- [ ] Todo alvo de toque com 40px ou mais; todo campo com rótulo.
