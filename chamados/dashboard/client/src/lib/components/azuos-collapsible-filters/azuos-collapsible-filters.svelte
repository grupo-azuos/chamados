<!--
  @component
  O CARTÃO DE FILTROS DO GRUPO — o de Empresas do paralegal, para toda tela com filtro.

  Fechado, mostra só o que se usa sempre (`primary`: a busca e o filtro principal) e o botão
  "Filtros", com quantos dos escondidos estão valendo. Embaixo, sempre à vista, a faixa do que
  MOSTRA (`toggles`: de quem, em uso ou arquivadas). O resto (`children`) abre e fecha pelo botão.

  O "Limpar filtros" fica na linha de cima, e não dentro do que abre: filtro valendo sem como
  desfazer à vista é a pessoa abrindo o cartão só para limpar.

  Aberto ou fechado é estado só de TELA, e por isso mora aqui. Nasce aberto quando já há filtro
  escondido valendo: filtro aplicado e fora de vista é lista "faltando coisa" sem explicação.

  - `data.label`: o nome do cartão para o leitor de tela ("Filtros das peças").
  - `data.activeCount`: quantos dos filtros escondidos estão valendo — o número no botão.
  - `primary`, `toggles`, `children`: o que fica à vista, a faixa de baixo e o que abre e fecha.
    Sem `children` não há botão "Filtros": um botão que abre um painel vazio é promessa quebrada.
  - `state.hasFilter` e `actions.onClear`: o "Limpar filtros".
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosCollapsibleFiltersProps = {
    data: { label: string; activeCount: number };
    ui?: { className?: string };
    state: { hasFilter: boolean };
    actions: { onClear: () => void };
    primary: Snippet;
    toggles?: Snippet;
    children?: Snippet;
  };

  /** "Filtros · 2" quando há escondido valendo; só "Filtros" sem. */
  export function filtersLabelOf(activeCount: number): string {
    return activeCount > 0 ? `Filtros · ${activeCount}` : 'Filtros';
  }
</script>

<script lang="ts">
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import { untrack } from 'svelte';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ClearFiltersButton from '$lib/components/azuos-clear-filters-button/azuos-clear-filters-button.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: filtersState, actions, primary, toggles, children }: AzuosCollapsibleFiltersProps =
    $props();

  /* Só a primeira contagem decide: depois quem abre e fecha é a pessoa. */
  let isOpen = $state(untrack(() => data.activeCount > 0));
</script>

<section aria-label={data.label} class={cn('rounded-surface bg-card shadow-card', ui?.className)}>
  <!-- `items-end`: os campos de cima têm rótulo, e o botão desce até a linha deles. -->
  <div class="flex flex-col gap-3 p-4 md:flex-row md:items-end">
    <!-- Uma coluna igual por campo, quantos a tela tiver (a busca sozinha, ou com outro filtro). -->
    <div class="grid min-w-0 flex-1 items-end gap-3 md:auto-cols-fr md:grid-flow-col">
      {@render primary()}
    </div>
    <div class="flex shrink-0 items-center gap-2">
      {#if children}
        <ActionButton
          data={{ label: filtersLabelOf(data.activeCount) }}
          ui={{
            variant: 'secondary',
            size: 'lg',
            icon: SlidersHorizontal,
            className: cn('shrink-0', isOpen && 'bg-primary-soft text-primary'),
          }}
          state={{ isPressed: isOpen }}
          actions={{ onClick: () => (isOpen = !isOpen) }}
        />
      {/if}
      <ClearFiltersButton state={filtersState} actions={{ onClear: actions.onClear }} />
    </div>
  </div>

  {#if children}
    <!-- ABRE E FECHA DESLIZANDO: a linha da grade vai de 0 à altura do conteúdo (`0fr` → `1fr`),
         sem medir nada em JavaScript. Fechado, o conteúdo continua montado mas fora do alcance
         (`inert`): o Tab não cai num campo invisível. Quem pediu menos movimento vê na hora. -->
    <div
      aria-hidden={!isOpen}
      inert={!isOpen}
      data-state={isOpen ? 'open' : 'closed'}
      class={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div class="min-h-0 overflow-hidden">
        <div class="border-border border-t p-4">{@render children()}</div>
      </div>
    </div>
  {/if}

  {#if toggles}
    <div class="border-border flex flex-wrap items-center gap-3 border-t px-4 py-3">
      {@render toggles()}
    </div>
  {/if}
</section>
