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
    state?: { isLoading?: boolean; isSaving?: boolean; error?: string | null };
    actions: { onChange: (ids: string[]) => void };
  };
</script>

<script lang="ts">
  import PeoplePicker from '$lib/components/azuos-people-picker/azuos-people-picker.svelte';

  let { data, state: cardState, actions }: AzuosTicketWatchersCardProps = $props();
</script>

<div class="border-border/70 flex flex-col gap-3 border-t pt-4">
  <div>
    <p class="text-ink-700 text-sm font-medium">Pessoas vinculadas</p>
    <p class="text-muted-foreground text-xs">
      Acompanham e escrevem no chamado junto de quem abriu.
    </p>
  </div>

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
