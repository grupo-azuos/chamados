<!--
  @component
  O LADO DE QUEM PEDIU da ordem de serviço, dentro da consulta da Central: escrever no chamado
  (texto e arquivos), escolher quem avisar e cuidar das pessoas vinculadas.

  Responder e reabrir são o MESMO formulário — o estágio do chamado decide qual dos dois ele é
  (`type`): andando, a pessoa dá retorno; encerrado, ela reabre dizendo por quê. Assim não existe
  "reabrir sem explicar". Os textos de cada caso saem de `copyOf`. O campo "Avisar por WhatsApp"
  só aparece quando há alguém para avisar; embaixo, as pessoas vinculadas (que veem e escrevem no
  chamado).

  Função pura de props: o envio, a lista de pessoas e a troca de vinculados são do hook
  `use-ticket-reply`.

  - `data`: `type`, `description`, `chosenFiles`, `notifyIds`/`notifiable` e
    `watcherIds`/`peopleOptions`.
  - `state`: envio (`isSubmitting`, `error`, `descriptionError`, `attachmentError`, `sentMessage`)
    e vinculados (`isLoadingPeople`, `isSavingWatchers`, `watchersError`).
  - `actions`: `onDescriptionChange`, `onChosenFilesChange`, `onAttachmentError`, `onNotifyChange`,
    `onWatchersChange` e `onSubmit`.
-->
<script lang="ts" module>
  import { type RequesterTicketHistoryType } from '@template/shared/domain/ticket-history.util';
  import { type TicketPerson } from '@template/shared/schemas/ticket-person.schema';

  /**
   * O LADO DE QUEM PEDIU da ordem de serviço, dentro da consulta da Central: escrever no
   * chamado (texto e arquivos), escolher quem avisar e cuidar das pessoas vinculadas.
   *
   * Responder e reabrir são o MESMO formulário — o estágio do chamado decide qual dos dois ele
   * é (`type`): andando, a pessoa dá retorno; encerrado, ela reabre dizendo por quê. Assim não
   * existe "reabrir sem explicar".
   *
   * Função pura de props: o envio, a lista de pessoas e a troca de vinculados são do hook
   * `use-ticket-reply`.
   */
  export type AzuosTicketReplyFormProps = {
    data: {
      type: RequesterTicketHistoryType;
      description: string;
      chosenFiles: File[];
      notifyIds: string[];
      notifiable: TicketPerson[];
      watcherIds: string[];
      peopleOptions: TicketPerson[];
    };
    state: {
      isSubmitting?: boolean;
      error?: string | null;
      descriptionError?: string | null;
      attachmentError?: string | null;
      sentMessage?: string | null;
      isLoadingPeople?: boolean;
      isSavingWatchers?: boolean;
      watchersError?: string | null;
    };
    actions: {
      onDescriptionChange: (value: string) => void;
      onChosenFilesChange: (files: File[]) => void;
      onAttachmentError: (message: string | null) => void;
      onNotifyChange: (ids: string[]) => void;
      onWatchersChange: (ids: string[]) => void;
      onSubmit: () => void;
    };
  };

  /** Os textos que mudam entre responder e reabrir — num lugar só, para não divergirem. */
  export function copyOf(type: RequesterTicketHistoryType) {
    return type === 'requester_reopening'
      ? {
          title: 'Reabrir chamado',
          hint: 'O problema voltou? Conte o que aconteceu: o chamado volta para a fila do TI.',
          label: 'Por que reabrir',
          submit: 'Reabrir chamado',
          submitting: 'Reabrindo…',
        }
      : {
          title: 'Dar retorno',
          hint: 'Responda, mande arquivos ou conte uma novidade: o TI vê que você respondeu.',
          label: 'Mensagem',
          submit: 'Enviar retorno',
          submitting: 'Enviando…',
        };
  }
</script>

<script lang="ts">
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AttachmentPicker from '$lib/components/azuos-attachment-picker/azuos-attachment-picker.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PersonMultiPickerField from '$lib/components/azuos-person-multi-picker-field/azuos-person-multi-picker-field.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';

  let { data, state, actions }: AzuosTicketReplyFormProps = $props();

  const copy = $derived(copyOf(data.type));

  /* As pessoas que o servidor devolveu, com a foto do admin-console, no campo de pessoa da casa
     (select-standard): a lista, a foto, a busca, e o valor é o id. */
  const notifiablePeople = $derived(data.notifiable.map(asPerson));
  const watcherPeople = $derived(data.peopleOptions.map(asPerson));

  function asPerson(person: TicketPerson) {
    return { id: person.id, name: person.name, photo: person.avatarUrl ?? null };
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<div class="border-border flex flex-col gap-5 border-t pt-4">
  <form novalidate class="flex flex-col gap-3" onsubmit={handleSubmit} aria-label={copy.title}>
    <div class="flex flex-col gap-0.5">
      <p class="text-muted-foreground text-sm font-medium">{copy.title}</p>
      <p class="text-muted-foreground text-xs">{copy.hint}</p>
    </div>

    <TextAreaField
      data={{ label: copy.label, name: 'description', value: data.description, isRequired: true }}
      ui={{ rows: 3 }}
      state={{ error: state.descriptionError, isDisabled: state.isSubmitting }}
      actions={{ onChange: actions.onDescriptionChange }}
    />

    <AttachmentPicker
      data={{ files: data.chosenFiles }}
      state={{ isDisabled: state.isSubmitting, error: state.attachmentError }}
      actions={{ onChange: actions.onChosenFilesChange, onError: actions.onAttachmentError }}
    />

    {#if data.notifiable.length > 0}
      <div class="flex flex-col gap-1.5">
        <span class="text-foreground text-sm font-medium">Avisar por WhatsApp</span>
        <PersonMultiPickerField
          data={{
            values: data.notifyIds,
            people: notifiablePeople,
            placeholder: 'Ninguém — só fica registrado',
          }}
          ui={{ ariaLabel: 'Avisar por WhatsApp' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onChange: actions.onNotifyChange }}
        />
        <p class="text-muted-foreground text-xs">Só recebe aviso quem você marcar.</p>
      </div>
    {/if}

    {#if state.error}
      <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
    {/if}
    {#if state.sentMessage}
      <p class="text-success text-sm font-medium" role="status">{state.sentMessage}</p>
    {/if}

    <div class="flex justify-end">
      <ActionButton
        data={{ label: copy.submit, loadingLabel: copy.submitting }}
        state={{ isLoading: state.isSubmitting }}
        actions={{ onClick: actions.onSubmit }}
      />
    </div>
  </form>

  <section class="flex flex-col gap-1.5" aria-label="Pessoas vinculadas">
    <p class="text-muted-foreground text-sm font-medium">
      Pessoas vinculadas
    </p>
    <p class="text-muted-foreground text-xs">
      Quem está vinculado vê o chamado em "Consultar chamado" e também pode escrever nele.
    </p>
    <PersonMultiPickerField
      data={{
        values: data.watcherIds,
        people: watcherPeople,
        placeholder: state.isLoadingPeople ? 'Carregando as pessoas…' : 'Vincular pessoas',
      }}
      ui={{ ariaLabel: 'Pessoas vinculadas' }}
      state={{ isDisabled: state.isSavingWatchers || state.isLoadingPeople }}
      actions={{ onChange: actions.onWatchersChange }}
    />
    {#if state.watchersError}
      <p class="text-destructive text-xs" role="alert">{state.watchersError}</p>
    {/if}
  </section>
</div>
