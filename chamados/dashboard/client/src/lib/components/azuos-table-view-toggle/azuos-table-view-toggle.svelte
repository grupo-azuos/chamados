<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Table from '@lucide/svelte/icons/table';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { slidingIndicator } from '$lib/motion/sliding-indicator';
  import { cn } from '$lib/utils/cn';

  /**
   * Tabela ou cards — ao lado de cada lista que tem os dois formatos. Cuida da própria
   * preferência (`lib/hooks/use-table-view`), do mesmo jeito que o `ThemeToggle` cuida do próprio
   * tema: a tela não guarda nenhum estado, só coloca o controle.
   *
   * São DOIS botões lado a lado, e não um ícone que troca: com um ícone só, a pessoa via o
   * formato para onde iria, apagado no canto, e não o formato em que estava. Aqui os dois
   * aparecem sempre, dentro de uma moldura, e o que está valendo fica preenchido com a cor
   * principal — dá para ler o estado sem clicar.
   *
   * Some abaixo de `xl`: no celular e no tablet a lista é sempre em cards (skill `ui-standards`
   * §6.1), então não há o que escolher — e um "Tabela" marcado ali seria mentira.
   */
  const tableView = useTableViewModel();

  /** O escolhido: o fundo é o destaque que desliza; aqui só o texto claro sobre ele. */
  const ACTIVE = 'text-primary-foreground hover:bg-transparent hover:text-primary-foreground';

  function choose(wantsCards: boolean) {
    if (tableView.forceCards === wantsCards) return;

    tableView.actions.onToggle();
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
  class="bg-muted hidden w-fit items-center gap-0.5 rounded-full p-0.5 xl:inline-flex"
>
  <ActionButton
    data={{ label: 'Ver em tabela' }}
    ui={{
      variant: 'ghost',
      size: 'sm',
      icon: Table,
      isIconOnly: true,
      /* Pílula dentro da pílula: a moldura e o destaque têm a mesma forma. */
      className: cn('rounded-full shadow-none', !tableView.forceCards && ACTIVE),
    }}
    state={{ isPressed: !tableView.forceCards }}
    actions={{ onClick: () => choose(false) }}
  />
  <ActionButton
    data={{ label: 'Ver em cards' }}
    ui={{
      variant: 'ghost',
      size: 'sm',
      icon: LayoutGrid,
      isIconOnly: true,
      className: cn('rounded-full shadow-none', tableView.forceCards && ACTIVE),
    }}
    state={{ isPressed: tableView.forceCards }}
    actions={{ onClick: () => choose(true) }}
  />
</div>
