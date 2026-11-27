<!--
  @component
  AS PESSOAS VINCULADAS na ficha do chamado — a "OS com envolvidos" do Tasy.

  Quem está aqui vê o chamado em "Meus chamados", responde, anexa e reabre pela Central, e pode ser
  avisado de um andamento. Marcar ou tirar salva na hora, como as áreas participantes logo acima:
  não espera o "Salvar" dos dados.

  `data` leva os ids marcados e as pessoas que podem entrar; `ui.isHeaderHidden` tira o título;
  `state`, carregamento, gravação e erro; `actions.onChange` recebe a lista nova.
-->
<script lang="ts" module>
  export type AzuosTicketWatchersCardProps = {
    data: { selectedIds: string[]; options: { id: string; name: string; avatarUrl?: string | null }[] };
    /** Sem o título: quando o cartão mora dentro de uma seção que já tem o nome dele. */
    ui?: { isHeaderHidden?: boolean };
    state?: { isLoading?: boolean; isSaving?: boolean; error?: string | null };
    actions: { onChange: (ids: string[]) => void };
  };
</script>

<script lang="ts">
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import PersonMultiPickerField from '$lib/components/azuos-person-multi-picker-field/azuos-person-multi-picker-field.svelte';

  let { data, ui, state: cardState, actions }: AzuosTicketWatchersCardProps = $props();

  /* Quem já está vinculado, na ordem da lista de pessoas — com o rosto, à vista. */
  const linked = $derived(data.options.filter((person) => data.selectedIds.includes(person.id)));
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

  <!-- Várias pessoas: o campo de várias pessoas da casa (select-standard), com a foto e o id. -->
  <PersonMultiPickerField
    data={{
      values: data.selectedIds,
      people: data.options.map((person) => ({ id: person.id, name: person.name, photo: person.avatarUrl ?? null })),
      placeholder: cardState?.isLoading ? 'Carregando as pessoas…' : 'Vincular pessoas',
    }}
    ui={{ ariaLabel: 'Pessoas vinculadas' }}
    state={{ isDisabled: cardState?.isSaving || cardState?.isLoading }}
    actions={actions}
  />

  {#if linked.length === 0}
    <p class="text-muted-foreground text-xs">Ninguém vinculado ainda.</p>
  {:else}
    <ul class="flex flex-wrap gap-x-4 gap-y-2" aria-label="Quem está vinculado">
      {#each linked as person (person.id)}
        <li class="flex items-center gap-2 text-sm">
          <PersonAvatar name={person.name} avatarUrl={person.avatarUrl ?? null} personId={person.id} ui={{ size: 'sm' }} />
          {person.name}
        </li>
      {/each}
    </ul>
  {/if}

  {#if cardState?.error}
    <ErrorState data={{ message: cardState.error }} ui={{ variant: 'inline' }} />
  {/if}
</div>
