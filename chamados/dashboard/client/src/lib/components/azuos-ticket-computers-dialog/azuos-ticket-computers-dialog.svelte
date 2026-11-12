<script lang="ts" module>
  /** Uma máquina como o diálogo a mostra — o bastante para reconhecê-la de relance. */
  export type TicketComputerChoice = {
    id: number;
    /** O nome de tela (apelido, ou o nome do Windows quando não há apelido). */
    label: string;
    /** O nome do Windows — o que vem na etiqueta da máquina. */
    hostname: string;
    responsibleName: string | null;
    /** O departamento como a tela o escreve. */
    department: string | null;
    /** O departamento como o filtro o compara (o valor da lista do RH). */
    departmentKey?: string | null;
    isOnline: boolean;
  };

  /**
   * VINCULAR MÁQUINAS a um chamado — um diálogo grande, com a busca do Inventário, onde se
   * marcam quantas máquinas forem antes de aplicar. Um atendimento pode passar por várias (o
   * monitor trocado em duas mesas), e escolher uma por vez num campo estreito não dava.
   *
   * Nada é gravado ao marcar: a escolha é um rascunho, e só "Aplicar" a envia. Cancelar desfaz.
   *
   * Função pura de props: a lista já chega filtrada, e a escolha vive no view-model.
   */
  export type AzuosTicketComputersDialogProps = {
    data: {
      computers: TicketComputerChoice[];
      selectedIds: number[];
      search: string;
      department: string;
      /** Os do RH e, depois da linha divisória, os daqui — a mesma lista do Inventário. */
      departments: { value: string; label: string; separatorBefore?: boolean }[];
    };
    state?: {
      isOpen?: boolean;
      isLoading?: boolean;
      isSaving?: boolean;
      error?: string | null;
    };
    actions: {
      onSearch: (value: string) => void;
      onDepartmentChange: (value: string) => void;
      onToggle: (id: number) => void;
      onClearSelection: () => void;
      onApply: () => void;
      onClose: () => void;
    };
  };

  /** "2 máquinas selecionadas" — o rodapé diz quanto vai ser aplicado. */
  export function selectionLabel(count: number): string {
    if (count === 0) return 'Nenhuma máquina selecionada';

    return count === 1 ? '1 máquina selecionada' : `${count} máquinas selecionadas`;
  }
</script>

<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import LaptopIcon from '@lucide/svelte/icons/laptop';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: dialogState, actions }: AzuosTicketComputersDialogProps = $props();

  const isBusy = $derived(Boolean(dialogState?.isSaving));
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-6xl">
    <DialogHeader>
      <DialogTitle>Máquinas do chamado</DialogTitle>
      <DialogDescription>
        Marque todas as máquinas deste atendimento e aplique. Nada muda antes de aplicar.
      </DialogDescription>
    </DialogHeader>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_16rem]">
      <TextField
        data={{
          label: 'Buscar',
          name: 'computerSearch',
          value: data.search,
          placeholder: 'Nome da máquina, apelido ou responsável',
        }}
        actions={{ onChange: actions.onSearch }}
      />
      <FilterField data={{ label: 'Departamento' }}>
        <OptionPicker
          data={{ value: data.department, options: data.departments }}
          ui={{
            ariaLabel: 'Departamento',
            allLabel: 'Todos os departamentos',
            fullWidth: true,
            mode: 'combobox',
            searchPlaceholder: 'Buscar departamento…',
          }}
          actions={{ onChange: actions.onDepartmentChange }}
        />
      </FilterField>
    </div>

    <!-- Estados na frente, conteúdo por último (CONTRIBUTING §2). -->
    {#if dialogState?.isLoading}
      <p class="text-muted-foreground py-10 text-center text-sm">Carregando as máquinas…</p>
    {:else if data.computers.length === 0}
      <EmptyState
        data={{
          title: 'Nenhuma máquina encontrada',
          description: 'Confira a busca ou o departamento escolhido.',
        }}
        ui={{ icon: LaptopIcon }}
      />
    {:else}
      <ul
        class="grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Máquinas do inventário"
      >
        {#each data.computers as computer (computer.id)}
          {@const isSelected = data.selectedIds.includes(computer.id)}
          <li>
            <!-- Escolhida = fundo na cor cheia (regra de UI do grupo), nunca borda colorida. -->
            <button
              type="button"
              aria-pressed={isSelected}
              disabled={isBusy}
              onclick={() => actions.onToggle(computer.id)}
              class={cn(
                'rounded-surface flex w-full cursor-pointer flex-col gap-2 border p-4 text-left shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                isSelected
                  ? 'bg-primary text-primary-foreground border-border'
                  : 'bg-card border-border/70 hover:bg-muted/50',
              )}
            >
              <span class="flex items-start justify-between gap-2">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold">{computer.label}</span>
                  <span
                    class={cn(
                      'block truncate text-xs',
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}>{computer.hostname}</span
                  >
                </span>
                <span
                  class={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border',
                    isSelected ? 'bg-primary-foreground text-primary border-transparent' : 'border-border',
                  )}
                  aria-hidden="true"
                >
                  {#if isSelected}<CheckIcon class="size-3.5" />{/if}
                </span>
              </span>
              <span class="flex flex-wrap items-center gap-2 text-xs">
                <span class={isSelected ? 'text-primary-foreground/90' : 'text-ink-700'}>
                  {computer.responsibleName ?? 'Sem responsável'}
                  {#if computer.department}· {computer.department}{/if}
                </span>
                <!-- O selo fica também no escolhido: sem ele o card encolhia e a grade pulava. -->
                <StatusBadge
                  data={{ label: computer.isOnline ? 'Online' : 'Offline' }}
                  ui={{
                    tone: computer.isOnline ? 'success' : 'neutral',
                    size: 'sm',
                    className: isSelected ? 'bg-primary-foreground text-primary' : undefined,
                  }}
                />
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if dialogState?.error}
      <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
    {/if}

    <DialogFooter class="items-center gap-2 sm:justify-between">
      <p class="text-ink-700 text-sm font-medium" role="status">
        {selectionLabel(data.selectedIds.length)}
        {#if data.selectedIds.length > 0}
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground ml-2 cursor-pointer text-xs underline-offset-2 hover:underline"
            onclick={actions.onClearSelection}
          >Limpar</button>
        {/if}
      </p>
      <div class="flex gap-2">
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: isBusy }}
          actions={{ onClick: actions.onClose }}
        />
        <ActionButton
          data={{ label: 'Aplicar', loadingLabel: 'Aplicando…' }}
          state={{ isLoading: isBusy }}
          actions={{ onClick: actions.onApply }}
        />
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
