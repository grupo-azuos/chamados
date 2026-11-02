# Regras Inegociáveis de Design e Governança Visual (Grupo Azuos)

Todo código gerado ou modificado nos 14 sistemas do Grupo Azuos DEVE seguir estritamente estas diretrizes. Não há exceções.

## 1. Botão de Voltar Canônico
- Em qualquer tela de detalhe, formulário ou entidade, o botão de voltar é EXCLUSIVAMENTE o `<AzuosBackButton data={{ destination: '...' }} />`.
- Formato visual obrigatório: o do paralegal ("Voltar para empresas") — `← Voltar para [destino]` em `text-brand-blue-700`, `text-sm`, seta de 14px, sublinhado no hover, sem negrito, sem moldura, sem fundo, sem caixa cinza, sem formato circular com `<` isolado.
- Botões manuais de voltar são terminantemente proibidos e rejeitados pelos hooks de linter.

## 2. Formulários e Inputs 100% Sólidos
- Todos os campos (`<Input>`, `<Textarea>`, `<SelectTrigger>`, `<AzuosTextField>`, `<AzuosComboboxField>`) devem ter fundo sólido `bg-muted` e texto `text-foreground`.
- Proibido o uso de `bg-transparent` ou inputs vazados apenas com contorno.
- Foco padronizado via anel suave: `focus-visible:ring-[3px] focus-visible:ring-ring/50`. Proibido contorno colorido de borda (`colored-border`).

## 3. Superfícies e Cards Sólidos
- Cards e painéis (`<Card>`, `<AzuosStatCard>`, `<AzuosToneCard>`, `<AzuosHeroCard>`) devem ter preenchimento 100% sólido e opaco (`bg-card` ou cores sólidas da marca).
- Proibido qualquer efeito de `backdrop-blur-*`, `glass`, transparências com opacidade solta (`/50`, etc.) e gradientes (`bg-gradient-*`).

## 4. Cards de Dashboard com Ícones
- Indicadores e cards de dashboard devem priorizar a presença de um ícone Lucide temático para padronização e identificação visual rápida.

## 5. Mascote Zuzu 100% Estático
- O mascote corporativo Zuzu não pode ter animações (`animate-*`), giros (`rotate-*`) ou transições de escala. Ele é fixo e estático em todas as telas.

## 6. Listas e Tabelas: Cards Pagina, Tabela Rola
- Visualização em grade de cards (`card-grid`): SEMPRE usa paginação com `<AzuosPaginationBar>`.
- Visualização em tabela (`<AzuosTable>`): SEMPRE usa scroll contínuo virtualizado com esqueletos (skeletons) milimetricamente alinhados à altura real da linha, evitando linhas vazias ou saltos.
- Alternância padronizada entre os dois modos via `<AzuosTableViewToggle>`.
- Proibido empilhar botões em linhas de tabelas. Usar menu discreto de 3 pontinhos (`DropdownMenu`).

## 7. Select vs Combobox (Regra dos 15 itens)
- Listas de seleção com 15 ou mais opções exigem obrigatoriamente Combobox com campo de pesquisa.
- Caso o usuário pesquise e não encontre o item desejado, o componente deve oferecer a opção de cadastrar diretamente.
- Seleção de usuário interno utiliza componente centralizado integrado ao `admin-console`.

## 8. Proibição de Telas de Criar Empresa/Grupo
- Exceto nos sistemas `crm`, `public-api` e provisoriamente `paralegal`, NENHUM outro sistema pode conter tela ou modal de cadastrar empresa/grupo econômico (`/empresas/novo`, etc.). Devem consumir os dados centralizados/mockados.

## 9. Exclusividade do Repositório Template
- A criação de novos componentes canônicos e a instalação de novas dependências visuais/UI só é permitida no repositório `template`. Os outros 13 sistemas apenas consomem os componentes homologados.

## 10. Cobertura de Testes Obrigatória (Mínimo de 90%)
- Todo novo componente ou modificação deve conter cobertura de testes com Vitest, cumprindo os thresholds estritos de 90% em linhas, funções, branches e statements.

## 11. Ações Duplas em Arquivos (Download + Abrir via Hyperlink)
- Sempre que houver função ou visualização de arquivo, o sistema DEVE obrigatoriamente fornecer DUAS funções:
  1. **Download**: Baixar o arquivo com seu nome original (`download={fileName}`).
  2. **Abrir via Hyperlink**: Abrir diretamente em nova aba do navegador (`target="_blank" rel="noopener noreferrer"`).
- Componentes canônicos: `<AzuosFileLinks />` e `<AzuosAttachmentList />`.

## 12. Upload e Anexo com Suporte Universal a Ctrl+V (Área de Transferência)
- Todo local ou componente de anexar arquivo (`<AzuosAttachmentPicker>`, campos de upload e dropzones) DEVE obrigatoriamente aceitar colar arquivos via `Ctrl+V` (captura direta de imagens/prints e arquivos do clipboard).
- Ao colar, os arquivos da área de transferência são adicionados à seleção, respeitando limites de quantidade e tamanho configurados.

## 13. Cor Só do `tokens.css` (Zero Cor Fixa)
- Toda cor de tela vem de um token do `lib/theme/tokens.css` (`bg-primary`, `text-muted-foreground`, `var(--chart-1)`…). É proibida qualquer cor fixa: paleta padrão do Tailwind (`text-gray-500`, `bg-blue-600`, `bg-emerald-50`…), hex/rgb/hsl escritos no código, e `black`/`white` puros.
- Vale para TODO arquivo de tela e de lógica de tela (`.tsx`, `.svelte`, `.ts`, `.css`, histórias): mapa de cor de gráfico, paleta sugerida, tema do ECharts e cor "de reserva" leem o `tokens.css` por `theme-color.util` (`themeColor('--chart-1')`), nunca por hex.
- As regras `brand/tokens-only` e `brand/no-pure-black-white` são erro e NÃO aceitam `design-ignore-next-line` nem `design-ignore-file`. Cor nova entra primeiro no `tokens.css` do `template`, e só depois nos sistemas.
- Os `text-white`/`bg-black` dos primitivos do shadcn (`lib/components/ui/`, que não se editam) resolvem para os tokens `--white`/`--black` da marca, remapeados no `@theme` do `tokens.css`.

## 14. Cards: Quatro Formatos sobre Uma Superfície
- Todo card é feito sobre `AzuosCardSurface` (`azuos-card-surface.svelte`): fundo da marca (`bg-card`) com a borda neutra, hover com a mancha do GSAP que entra a partir do mouse, escolhido no azul claro da marca (`bg-card-selected`) com texto e ícone brancos.
- Os quatro formatos: card de painel e filtro grande com ícone (`<AzuosStatCard>`), filtro pequeno (`<AzuosMiniStatCard>`), card de conteúdo com o ícone do assunto grande no canto (`<AzuosContentCard>`) e o hero com Zuzu (`<AzuosDashboardHeroCard>`, que usa o card de painel por dentro). Card novo usa um deles; não se monta card à mão.
- Cor de card é SÓ sotaque, dos oito tons sóbrios de `lib/theme/tokens.css` (`--hue-blue|red|amber|green|steel|plum|slate|copper`), pelas classes de `$lib/utils/card-tone.util.ts`: bolinha do ícone, número, ícone grande do canto, bolinha do selo. Nunca fundo pastel, fundo cheio no tom, neon ou borda colorida.
- O hover é neutro por padrão. Colorido só com a flag `ui.isHoverColored` + o tom do card; aí a mancha usa o sotaque com transparência — a única transparência permitida em card.
- Cor escolhida pela pessoa vira o sotaque mais próximo (`cardHueFromHex`).
- Texto que pode cruzar o ícone grande do canto ganha margem à direita (ou uma faixa sólida por cima), para nunca passar por cima do desenho.

