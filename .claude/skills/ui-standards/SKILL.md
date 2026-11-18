---
name: ui-standards
description: O padrão de UI/UX do projeto — marca Grupo Azuos, tokens de cor, estrutura de toda tela, estados obrigatórios (carregando, erro, vazio, filtrado), texto de tela em português, botões, formulários, confirmação, acessibilidade e movimento. Consulte sempre que for desenhar ou revisar uma tela, escrever texto que aparece para o usuário ou quando a pessoa pedir algo "mais bonito", "mais claro" ou "igual aos outros sistemas".
---

# Padrão de UI/UX

O objetivo não é enfeitar: é que **todo MVP da casa pareça o mesmo sistema** e que a pessoa
nunca fique sem saber o que aconteceu.

## Marca e cores

Tudo vem de `client/src/lib/theme/tokens.css`. **Nunca escreva hex no componente.**

| Uso | Classe |
|---|---|
| Ação principal, menu | `bg-primary` (hover `bg-primary/90`) |
| Acento (o ponto amarelo da logo) | `bg-accent-hero` — uma coisa por tela, no máximo |
| Texto principal / secundário / apagado | `text-ink-900` / `text-ink-700` / `text-ink-500` |
| Borda | `border-border` (ou `border-ink-300`) |
| Superfície de cartão | `bg-card` |
| Degraus de fundo | `bg-base` (página) · `bg-mantle`/`bg-crust` (abaixo) · `bg-surface` (acima) |
| Erro | `text-destructive`, `border-destructive`, `AzuosErrorState` |
| Tons de estado | `text-success`/`bg-success-soft`, `warning`, `info`, `destructive`, `primary` — o `-soft` é o fundo SÓLIDO do tom |
| Situação | via `AzuosStatusBadge` com tom do domínio: `neutral`, `info`, `success`, `warning`, `danger`, `brand` |
| Categoria de gráfico | `--chart-1` a `--chart-5`, resolvidos por `lib/utils/chart-slice.util.ts` |

A logo (`AzuosBrandMark`) é branca: só sobre o azul. Ícones: **Lucide, sempre**; emoji não é ícone.

**Tema claro e escuro.** O tema é um atributo `data-theme` no `<html>` (`lib/theme/theme.ts`, botão
`AzuosThemeToggle`). Por isso nenhuma cor tem definição única no escuro: tudo é token, e token
escrito em hex no componente não acompanha a troca.

### A régua de altura e o raio por papel

| Altura | Onde |
|---|---|
| `control-sm` (32px) | dentro de outra coisa: linha de tabela, rodapé de cartão, paginação |
| `control-md` (36px) | a ação da tela: cabeçalho e rodapé de diálogo, botão de enviar |
| `control-lg` (40px) | campo de formulário E de filtro: texto, data, seletor, combobox |

**O que divide fileira tem a mesma altura.** Um botão ao lado de um campo é `control-lg`; sozinho
num cabeçalho é `control-md`. A altura mora no `azuos-*`, nunca na tela.

| Raio | Onde |
|---|---|
| `rounded-surface` | o que pousa sobre o fundo: cartão, diálogo, tabela |
| `rounded-control` | o que se clica ou se digita: campo, botão, pastilha |
| `rounded-box` | bloco dentro de um cartão, aviso, balão |
| `rounded-chip` | miudeza dentro de um bloco: item de lista de balão, quadradinho de ícone |
| `rounded-full` | selo e bolinha |

**Todo campo tem o mesmo canto (`rounded-control`) e a mesma altura (`control-lg`), medido na
tela.** Componente baixado traz canto e altura próprios, e a classe certa escrita no código pode
perder para a dele em silêncio. Ao revisar uma tela, compare os campos da mesma fileira; a forma de
garantir está na skill `design-system` §6 e no teste `lib/theme/control-ruler.test.tsx`.

Sombra: `shadow-xs` em repouso, `shadow-xl` no que flutua. Nada de `rounded-lg`, `shadow-md` ou
`text-[11px]` escolhidos no olho — o `npm run check:design` reprova.

## Estrutura de toda tela

```
AzuosBackButton (quando em tela de detalhe/entidade: ← Voltar para [destino])
AzuosPageHeader (título h1 + uma linha do que é a tela + ações à direita)
Barra de filtros (AzuosFilterField + AzuosOptionPicker/AzuosSelectField), quando é lista
Aviso de falha de ação (AzuosErrorState inline), quando houver
Corpo
```

Largura: `mx-auto w-full max-w-5xl px-4 sm:px-6`. Espaço entre blocos: `gap-5`.
Uma ação principal por tela (azul). As outras são `secondary` ou `ghost`.

## As Leis Absolutas do Padrão Azuos 2.0 (Blindagem de Design)

1. **Botão de Voltar Canônico (`AzuosBackButton`):** Todo retorno de página é exclusivamente um link limpo `← Voltar para [destino]` no desenho do paralegal (`text-brand-blue-700`, `text-sm`, seta de 14px, sublinhado no hover, sem negrito). Proibido botão com moldura, circular com ícone ou texto fora desse padrão.
2. **Inputs 100% com Fundo Sólido (`bg-muted`):** Todo input, textarea, select e combobox tem preenchimento sólido `bg-muted text-foreground`. Proibido `bg-transparent` ou misturar campos outline com campos cinzas.
3. **Cards Sólidos Sem Vidro:** Cards são 100% opacos (`bg-card` ou cor sólida da paleta). Proibido `backdrop-blur`, gradientes (`bg-gradient-*`) e transparências translúcidas.
4. **Cards de Dashboard com Ícone:** Cards de estatística (`AzuosStatCard`) e destaque (`AzuosHeroCard`) usam prioritariamente ícones Lucide padronizados.
5. **Mascote Zuzu Estático:** O mascote Zuzu corporativo é 100% estático. Proibido `animate-*`, giros ou transforms.
6. **Card Grid sempre Pagina vs Tabela sempre Scroll Contínuo:** Visualização em grade de cards SEMPRE usa paginação (`AzuosPaginationBar`); tabela/lista usa scroll contínuo sem campos em branco.
7. **Proibição de Tabela de Botões:** Proibido enfileirar botões em cada linha da tabela. Usar menu discreto de 3 pontinhos (`DropdownMenu`).
8. **Select com 15+ Itens Vira Combobox:** Mais de 15 itens exige Combobox com pesquisa. Se pesquisar e não encontrar, deve oferecer opção de cadastrar novo item.
9. **Bloqueio de Cadastro de Empresa/Grupo:** Exceto CRM, Public-API e Paralegal, nenhum sistema pode criar tela ou modal de cadastrar empresa/grupo; devem usar os mocks unificados.
10. **Exclusividade do Template:** Criação de novos componentes canônicos e instalação de bibliotecas visuais só é permitida no repositório `template`. Os demais 13 sistemas apenas consomem.
11. **Ações Duplas em Arquivos (Download + Abrir via Hyperlink):** Toda exibição ou link de arquivo DEVE fornecer duas opções obrigatórias: baixar o arquivo (`download={fileName}`) e abrir diretamente via hyperlink em nova aba (`target="_blank" rel="noopener noreferrer"`). Componentes canônicos: `<AzuosFileLinks />` e `<AzuosAttachmentList />`.
12. **Upload e Anexo com Suporte a Ctrl+V (Área de Transferência):** Todo local ou componente de anexar arquivo (`<AzuosAttachmentPicker>`, áreas de upload e dropzones) DEVE aceitar colar arquivos via `Ctrl+V` (captura direta de prints e arquivos do clipboard).

## O corpo, sempre nesta ordem (early return)

1. **Carregando** → esqueleto com a forma do conteúdo (`Skeleton`, de `azuos-skeleton`). Nunca "nenhum registro".
2. **Erro** → `AzuosErrorState` com título ("A lista não carregou"), o motivo que veio da API e
   "Tentar de novo".
3. **Vazio de verdade** → `AzuosEmptyState` dizendo o que está vazio + o próximo passo + botão de
   criar.
4. **Filtro escondeu tudo** → `AzuosEmptyState` "Nenhum X encontrado" + "Limpar filtros".
5. **Conteúdo** → com contagem ("12 de 40 clientes") e aviso se a lista foi cortada.

## Texto de tela

- **Português do Brasil**, frase curta, sem jargão técnico. "Não consegui salvar" em vez de
  "Erro 500".
- **Botão diz o verbo**: "Criar cliente", "Salvar", "Excluir pedido". Nunca "OK", "Sim",
  "Enviar dados".
- **Erro diz o motivo e o que fazer**: "Informe o telefone", "Esse e-mail já está cadastrado.
  Abra o cadastro existente em vez de criar outro."
- **Vazio diz o próximo passo**: "Nenhum cliente ainda. Cadastre o primeiro para começar."
- Títulos em sentença ("Novo cliente"), não Title Case.
- Datas por `formatDate`/`formatDateTime` (`lib/utils/format-date.util.ts`) → `14/09/2026`.
- Números com `toLocaleString('pt-BR')`. Dinheiro com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

## Formulário

- Em modal para cadastro curto; em tela própria se tiver mais de ~8 campos. O conteúdo do modal é
  o `AzuosResponsiveDialogContent`: no celular ele nasce de baixo, como gaveta.
- Rótulo acima do campo, **erro colado embaixo do campo** (nunca só um resumo no topo).
- Erro aparece depois que a pessoa **sai do campo** ou **tenta enviar** — nunca na primeira letra.
- Enter envia (`<form onSubmit>`). O botão de enviar trava e diz "Salvando…".
- Recusa do servidor aparece **dentro** do formulário, que **continua aberto** com o que foi
  digitado.
- Primeiro campo com foco automático.

## Ações destrutivas

Excluir, arquivar, enviar sem volta → `AzuosConfirmDialog` com título em pergunta ("Excluir este
cliente?"), descrição com o nome do registro e "Não dá para desfazer.", botão `danger` com o
verbo. Enquanto confirma, nada fecha.

## Listas

- Cartões empilhados para até ~5 informações por item; tabela (`AzuosTable`) quando a pessoa
  compara colunas. Quem tem os dois formatos põe o `AzuosTableViewToggle` ao lado — a preferência é
  do sistema inteiro, não da tela. Lista longa leva `AzuosPaginationBar`, que diz o total.
- Ações do item à direita, como ícone `ghost` com `aria-label` (o nome aparece na dica).
- Texto longo quebra linha (`break-words`), nunca empurra os botões.
- Item concluído/inativo: `text-ink-500`, sem sumir.

## Acessibilidade (não é opcional)

- Tudo operável no teclado; foco sempre visível (já vem do `tokens.css`).
- Campo com rótulo ligado; erro com `aria-invalid`/`aria-describedby`; falha com `role="alert"`.
- Botão só de ícone tem `aria-label`. Ícone decorativo tem `aria-hidden`.
- Contraste: texto sobre azul é branco; nunca `text-ink-500` sobre `bg-ink-100` em informação
  importante.

## Movimento

Só pelas funções de `lib/motion/motion.util.ts` (`fadeInUp`, `staggerIn`, `countTo`…): curtas
(< 350ms) e **desligadas** quando o sistema operacional pede menos movimento. Animação explica o
que mudou de lugar; não é enfeite.

O sistema também mede a máquina: se as animações saem travadas, o nível de efeitos cai sozinho para
o leve (`lib/hooks/use-effects`, atributo `data-effects` no `<html>`, botão `AzuosEffectsToggle`). No
modo leve o resultado é o mesmo; só a animação sai. O preenchimento no hover
(`lib/motion/use-hover-fill.ts` + a utilidade `hover-fill`) respeita os dois.

## Responsivo

Tudo precisa funcionar em 400px de largura: filtros empilham (`flex-col sm:flex-row`), ações do
`AzuosPageHeader` descem, grade de `AzuosStatCard` vira uma coluna.
