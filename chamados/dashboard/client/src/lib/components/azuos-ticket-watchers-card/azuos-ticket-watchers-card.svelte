<script lang="ts" module>
  /**
   * AS PESSOAS VINCULADAS na ficha do chamado — a "OS com envolvidos" do Tasy.
   *
   * Quem está aqui vê o chamado em "Meus chamados", responde, anexa e reabre pela Central, e
   * pode ser avisado de um andamento. Marcar ou tirar salva na hora, como as áreas
   * participantes logo acima: não espera o "Salvar" dos dados.
   */
  export type AzuosTicketWatchersCardProps = {
    data: { selectedIds: string[]; options: { id: string; name: string }[] };
    /** Sem o título: quando o cartão mora dentro de uma seção que já tem o nome dele. */
    ui?: { isHeaderHidden?: boolean };
    state?: { isLoading?: boolean; isSaving?: boolean; error?: string | null };
    actions: { onChange: (ids: string[]) => void };
  };
</script>

<script lang="ts">
  import PeoplePicker from '$lib/components/azuos-people-picker/azuos-people-picker.svelte';

  let { data, ui, state: cardState, actions }: AzuosTicketWatchersCardProps = $props();
</script>

<div class={ui?.isHeaderHidden ? 'flex flex-col gap-3' : 'border-border flex flex-col gap-3 border-t pt-4'}>
  {#if ui?.isHeaderHidden}
    <p class="text-muted-foreground text-xs">Acompanham e escrevem no chamado junto de quem abriu.</p>
  {:else}
    <div>
      <p class="text-ink-700 text-sm font-medium">Pessoas vinculadas</p>
      <p class="text-muted-foreground text-xs">
        Acompanham e escrevem no chamado junto de quem abriu.
      </p>
    </div>
  {/if}

  <PeoplePicker
    data={data}
    ui={{
      ariaLabel: 'Pessoas vinculadas',
      placeholder: 'Vincular pessoas',
      emptyLabel: 'Ninguém vinculado ainda.',
    }}
    state={{
      isLoading: cardState?.isLoading,
      isDisabled: cardState?.isSaving,
      error: cardState?.error,
    }}
    actions={actions}
  />
</div>
