<!--
  @component
  Tabela ou cards — ao lado de cada lista que tem os dois formatos. Cuida da própria preferência
  (`lib/hooks/use-table-view`), do mesmo jeito que o `AzuosThemeToggle` cuida do próprio tema: a
  tela não guarda nenhum estado, só coloca o controle. Sem props, é isso e só isso.

  São DOIS botões lado a lado, e não um ícone que troca: com um ícone só, a pessoa via o formato
  para onde iria, apagado no canto, e não o formato em que estava. Aqui os dois aparecem sempre,
  dentro de uma moldura, e o que está valendo fica preenchido com a cor principal — dá para ler o
  estado sem clicar.

  Some abaixo de `xl`: no celular e no tablet a lista é sempre em cards (skill `ui-standards` §6.1),
  então não há o que escolher — e um "Tabela" marcado ali seria mentira.

  Com `ui.hasKanban`, ganha a TERCEIRA opção, "Ver em quadro" (as filas de chamados). O quadro é um
  modo da TELA, e não uma preferência do sistema: quem guarda é a tela — `state.isKanban` diz se
  ela está nele e `actions.onKanbanChange` avisa a troca. Aí o controle aparece em qualquer largura
  (entre cards e quadro também se escolhe no celular), e só o "Tabela" some abaixo de `xl`.
-->
<script lang="ts" module>
  export type AzuosTableViewToggleProps = {
    ui?: {
      /** Oferece o quadro (kanban) como terceira opção. */
      hasKanban?: boolean;
    };
    state?: {
      /** A tela está no quadro. */
      isKanban?: boolean;
    };
    actions?: {
      /** `true` ao escolher o quadro; `false` ao voltar para tabela ou cards. */
      onKanbanChange?: (isKanban: boolean) => void;
    };
  };

  export type TableViewChoice = 'table' | 'cards' | 'kanban';

  /**
   * Qual botão está marcado. Abaixo de `xl` não existe tabela: a lista é cards, e é o "cards"
   * que fica marcado — senão nenhum botão à vista diria o formato em uso.
   */
  export function chosenView(input: {
    isKanban: boolean;
    forceCards: boolean;
    isNarrow: boolean;
  }): TableViewChoice {
    if (input.isKanban) return 'kanban';

    return input.forceCards || input.isNarrow ? 'cards' : 'table';
  }
</script>

<script lang="ts">
  import Columns3 from '@lucide/svelte/icons/columns-3';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Table from '@lucide/svelte/icons/table';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { useMediaQuery, XL_BREAKPOINT } from '$lib/hooks/use-media-query/use-media-query.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { slidingIndicator } from '$lib/motion/sliding-indicator';
  import { cn } from '$lib/utils/cn';

  let { ui, state: toggleState, actions }: AzuosTableViewToggleProps = $props();

  const tableView = useTableViewModel();
  const narrow = useMediaQuery(XL_BREAKPOINT);

  const hasKanban = $derived(Boolean(ui?.hasKanban));
  const isKanban = $derived(hasKanban && Boolean(toggleState?.isKanban));
  const chosen = $derived(
    chosenView({
      isKanban,
      forceCards: tableView.forceCards,
      /* Sem o quadro o controle nem aparece no estreito: lá vale a regra antiga, tabela marcada. */
      isNarrow: hasKanban && narrow.current,
    }),
  );

  /** O escolhido: o fundo é o destaque que desliza; aqui só o texto claro sobre ele. */
  const ACTIVE = 'text-primary-foreground hover:bg-transparent hover:text-primary-foreground';

  /* Clicar no formato que já vale não faz nada: são escolhas, não um liga/desliga. Sair do quadro
     para a tabela (ou os cards) também acerta a preferência de lista no caminho. */
  function choose(wantsCards: boolean) {
    if (isKanban) actions?.onKanbanChange?.(false);
    /* No estreito a lista já é sempre cards: o clique só sai do quadro, sem mexer na preferência
       que vale no monitor. */
    if (hasKanban && narrow.current) return;
    if (tableView.forceCards === wantsCards) return;

    tableView.actions.onToggle();
  }

  function chooseKanban() {
    if (isKanban) return;

    actions?.onKanbanChange?.(true);
  }
</script>

<!-- O preenchimento do formato escolhido desliza até o outro na troca. -->
<div
  role="group"
  aria-label="Formato da lista"
  use:slidingIndicator={{
    selector: '[aria-pressed="true"]',
    indicatorClass: 'rounded-full bg-primary',
    attributes: ['aria-pressed'],
  }}
  class={cn(
    'bg-muted w-fit items-center gap-0.5 rounded-full p-0.5',
    hasKanban ? 'inline-flex' : 'hidden xl:inline-flex',
  )}
>
  <ActionButton
    data={{ label: 'Ver em tabela' }}
    ui={{
      variant: 'ghost',
      size: 'sm',
      icon: Table,
      isIconOnly: true,
      /* Pílula dentro da pílula: a moldura e o destaque têm a mesma forma. */
      className: cn(
        'rounded-full shadow-none',
        hasKanban && 'hidden xl:inline-flex',
        chosen === 'table' && ACTIVE,
      ),
    }}
    state={{ isPressed: chosen === 'table' }}
    actions={{ onClick: () => choose(false) }}
  />
  <ActionButton
    data={{ label: 'Ver em cards' }}
    ui={{
      variant: 'ghost',
      size: 'sm',
      icon: LayoutGrid,
      isIconOnly: true,
      className: cn('rounded-full shadow-none', chosen === 'cards' && ACTIVE),
    }}
    state={{ isPressed: chosen === 'cards' }}
    actions={{ onClick: () => choose(true) }}
  />
  {#if hasKanban}
    <ActionButton
      data={{ label: 'Ver em quadro' }}
      ui={{
        variant: 'ghost',
        size: 'sm',
        icon: Columns3,
        isIconOnly: true,
        className: cn('rounded-full shadow-none', chosen === 'kanban' && ACTIVE),
      }}
      state={{ isPressed: chosen === 'kanban' }}
      actions={{ onClick: chooseKanban }}
    />
  {/if}
</div>
