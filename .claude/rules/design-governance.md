# Regras de Design do Grupo Azuos — Padrão Apple

Todo código gerado ou modificado nos sistemas do Grupo Azuos segue estas regras. O padrão visual é
um só, o **padrão Apple**: superfícies limpas, sem borda, cantos grandes, sombra difusa, botões em
pílula, fonte do sistema, e a cor de cada assunto num ícone cheio. Ele não muda de tema por tela
nem por pessoa — só entre claro e escuro.

A fonte da verdade visual é o `lib/theme/tokens.css` do `template`; a vitrine é o app **brand**
(Marca), com o link do Storybook do template. O `check:design` confere o que dá para conferir no
código (hook do Claude e CI); o resto está aqui e no Storybook.

## 1. Os tokens mandam

- Toda cor, canto, sombra e fonte vem de um token do `tokens.css`. Valor escrito na tela (hex,
  rgb, paleta do Tailwind, `black`/`white`) é recusado (`brand/tokens-only`,
  `brand/no-pure-black-white`, sem exceção).
- Branco e preto puros só existem como **valor de token** dentro do `tokens.css` (o card claro do
  padrão Apple é branco). A tela usa o nome: `bg-card`, `text-foreground`, `text-on-hue`.
- Cor nova entra primeiro no `tokens.css` do `template`, depois nos sistemas.

## 2. Forma

| Papel | Token | Valor | Classe |
| --- | --- | --- | --- |
| Campo (input, select, combobox) | `--shape-control` | 10px | `rounded-control` |
| Botão | `--shape-button` | pílula | `rounded-button` |
| Card e painel | `--shape-card` | 20px | `rounded-surface` / `rounded-card` |
| Diálogo e folha | `--shape-dialog` | 22px | `rounded-dialog` |
| Chip, selo, badge | `--shape-chip` | pílula | `rounded-chip` / `rounded-badge` |
| Ícone de assunto | `--shape-icon` | 28% ("squircle") | `rounded-icon` |

- Canto escolhido no olho (`rounded-lg`, `rounded-[14px]`) não entra: o canto vem do **papel**.
- Todo controle usa a régua de altura (`control-sm` 32px, `control-md` 36px, `control-lg` 40px),
  definida no componente `azuos-*`, nunca na tela.

## 3. Superfícies: card sem borda, sobre o fundo

- O fundo da página é o cinza do sistema (`bg-background`); o card é a superfície (`bg-card`)
  **sem borda**. O que separa os dois é o fio de 1px e a sombra difusa do `--elevation-card`
  (`shadow-card`). Card com borda em volta é recusado (`apple/card-without-border`).
- **Card nunca vai dentro de card da mesma cor.** Os cards de uma tela ficam sobre o fundo da
  página; um painel que agrupa cards não tem fundo próprio.
- Borda só existe como **divisória** (`border-b`, `divide-y`) e como **tracejado** de "solte aqui"
  (`border-2 border-dashed`).
- Menus flutuantes (select, combobox, popover, data): `bg-popover`, sem borda, com o anel de 1px
  (`ring-1 ring-foreground/8`) e sombra grande. Todo menu abre **centralizado embaixo do botão**
  que o abriu (`align="center"`), com a **largura do conteúdo** (`w-max`), nunca mais estreito que
  o botão e no máximo `26rem`. Menu com busca começa em `14rem`, para caber o campo.
- Proibido: gradiente, vidro (`backdrop-blur`), transparência solta em card
  (`brand/no-gradients-or-glass`, `brand/no-card-opacity`).
- Todo card é feito sobre `<AzuosCardSurface>` (ou um dos formatos que o usam): `AzuosStatCard`,
  `AzuosMiniStatCard`, `AzuosContentCard`, `AzuosPanelCard` e o hero com Zuzu
  (`AzuosDashboardHeroCard`). Card montado à mão não entra.

## 4. Cor: no ícone, no status e no gráfico — nunca no fundo

- Cada assunto ou área tem um tom (`--hue-blue|red|yellow|green|steel|plum|slate|copper`), lido
  pelas classes de `lib/utils/card-tone.util.ts`. No padrão Apple os tons são as cores do sistema:
  azul, vermelho, amarelo, verde, ciano, roxo, cinza e índigo.
- **Onde a cor entra:** o ícone cheio do card (quadrado de canto redondo, `rounded-icon`, com o
  desenho branco — escuro no amarelo), a bolinha de status, o chip de status (fundo do tom bem
  claro + texto do tom), o gráfico, o selo de notificação.
- **Onde a cor NÃO entra:** fundo de card, fundo de faixa ou cabeçalho, borda, número grande.
  O número do card fica na cor do texto (`text-foreground`): a cor do assunto mora no ícone.
- Amarelo como texto some no claro: texto e ícone soltos amarelos usam o `-ink`
  (`brand/readable-yellow-text`).
- Cor escolhida pela pessoa vira o tom mais próximo (`cardHueFromHex`).

## 5. Tipografia

- Fonte do sistema (`-apple-system`, SF Pro, Segoe UI, Roboto), pelos tokens `--brand-font-*`.
- Rótulo e título escritos **como frase** ("Alvarás vencidos"), em cinza de apoio
  (`text-sm font-medium text-muted-foreground`). Caixa alta espaçada é do visual antigo
  (`apple/sentence-case-labels`, aviso).
- Número de painel grande e em negrito, com `tabular-nums`.

## 6. Hover, foco e movimento

- O hover **destaca, nunca esconde**. Card clicável sobe 2px e a sombra cresce
  (`hover:shadow-card-hover motion-safe:hover:-translate-y-0.5`, já no `AzuosCardSurface`). Painel
  que desliza por cima do conteúdo é recusado (`apple/hover-never-covers`).
- Linha de lista ou tabela: véu neutro (`hover:bg-hover-veil`) com **respiro** — a linha tem
  padding lateral e canto (`rounded-control`), o véu nunca cola no texto.
- Hover é neutro. Cor no hover só com `ui.isHoverColored` do card, e só o véu leve no tom.
- Foco: o anel suave (`focus-visible:ring-[3px] focus-visible:ring-ring/50`), nunca borda colorida.
- **Tudo que abre e fecha anima** — bloco que expande, menu, diálogo, folha: a caixa desliza na
  altura do conteúdo (`animate-collapsible-down/up`, `animate-in`/`animate-out`), a seta gira e o
  conteúdo entra aparecendo. Nada surge ou some de uma vez.
- Todo movimento respeita `motion-safe:`/`prefers-reduced-motion`.

## 7. Campos e botões

- Campo é **cinza cheio sem contorno** (`bg-muted`, `border-transparent`); o foco é o anel. Campo
  com erro: fundo vermelho claro (`bg-destructive-soft`). Proibido campo vazado
  (`brand/solid-inputs`).
- Botão principal: pílula azul (`bg-primary`). Secundário: pílula cinza (`bg-muted`). Uma ação
  principal por área (`von-restorff/single-primary`).
- Grupo de opções e alternância (grade/lista, Meus/Equipe): pílula cinza com a opção escolhida
  em branco por cima (`AzuosSegmentedControl`, `AzuosTableViewToggle`).
- Nunca `<select>` nativo: sempre o seletor do projeto. Com 15 opções ou mais, combobox com busca
  e "Cadastrar «termo»" quando der (skill `select-standard`). Pessoa é sempre
  `AzuosPersonPickerField`.

## 8. Listas e tabelas

- Grade de cards (`card-grid`): sempre paginada com `<AzuosPaginationBar>`.
- Tabela (`<AzuosTable>`): rola sem fim, virtualizada, com esqueletos da altura real da linha.
  Cabeçalho em frase, cinza, sem faixa de fundo.
- Alternância entre os dois modos pelo `<AzuosTableViewToggle>`.
- Ação em linha: menu de 3 pontinhos, nunca botões empilhados.
- Notificação ou pendência num card: selo vermelho no canto, que pulsa só com `motion-safe:`.

## 9. Voltar, arquivos e anexos

- Voltar é sempre o `<AzuosBackButton data={{ destination: '...' }} />`: `← Voltar para
  [destino]`, texto na cor principal, sem moldura (`brand/canonical-back-button`).
- Arquivo tem sempre as duas ações: baixar (`download={fileName}`) e abrir em nova aba
  (`target="_blank" rel="noopener noreferrer"`) — `<AzuosFileLinks />`, `<AzuosAttachmentList />`
  (`brand/dual-file-actions`).
- Todo lugar de anexar aceita colar com `Ctrl+V` (`brand/paste-file-attachment`).

## 10. Zuzu

- O mascote é **estático**: sem animação, giro ou escala (`brand/static-zuzu`).
- Ele fala em três lugares: o alerta do dia (hero), a lista vazia ("nada aqui") e a pendência
  ("falta isto"). Não vira enfeite de canto.

## 11. Organização das telas

- Toda tela segue um molde, nesta ordem: cabeçalho (título + ação principal) → resumo (cards de
  número) → barra de ferramentas (busca → filtros → ordenar → modo de ver) → conteúdo →
  paginação.
- Espaço entre blocos `gap-6`; dentro de card `p-4`/`p-5`; grade de cards `gap-3`/`gap-4`.

## 12. Componentes, testes e documentação

- Componente canônico novo e dependência visual nova só no repositório `template`; os sistemas
  consomem. Todo componente `azuos-*` tem `.stories.svelte` e página de documentação no Storybook
  (texto: para que serve, quando usar, quando não usar, variações).
- Cobertura mínima de 90% (linhas, funções, branches, statements) no que mudar.
- Empresa e grupo econômico só se cadastram no `crm`, na `public-api` e, por enquanto, no
  `paralegal`.
