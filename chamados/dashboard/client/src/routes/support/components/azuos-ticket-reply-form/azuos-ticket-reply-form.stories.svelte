<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TicketReplyForm from './azuos-ticket-reply-form.svelte';

  const people = [
    { id: 'u-1', name: 'Ana Lima' },
    { id: 'u-2', name: 'Caio Reis' },
    { id: 'u-3', name: 'Dani Alves' },
  ];
  const data = {
    type: 'requester_reply' as const,
    description: '',
    chosenFiles: [],
    notifyIds: [],
    notifiable: people.slice(0, 2),
    watcherIds: ['u-2'],
    peopleOptions: people,
  };
  const actions = {
    onDescriptionChange: () => {},
    onChosenFilesChange: () => {},
    onAttachmentError: () => {},
    onNotifyChange: () => {},
    onWatchersChange: () => {},
    onSubmit: () => {},
  };

  const { Story } = defineMeta({
    title: 'Features/Support/AzuosTicketReplyForm',
    component: TicketReplyForm,
  });
</script>

<!-- Chamado andando: dar retorno. -->
<Story name="Default" args={{ data, state: {}, actions }} />

<!-- Chamado encerrado: o mesmo formulário vira reabertura. -->
<Story name="Reopen" args={{ data: { ...data, type: 'requester_reopening' }, state: {}, actions }} />

<Story name="Submitting" args={{ data: { ...data, description: 'Segue o print.' }, state: { isSubmitting: true }, actions }} />

<Story name="Sent" args={{ data, state: { sentMessage: 'Retorno enviado ao TI.' }, actions }} />

<Story
  name="WithErrors"
  args={{
    data,
    state: { descriptionError: 'Descreva o que aconteceu', error: 'Não consegui enviar agora.', watchersError: 'Alguma das pessoas não está mais ativa.' },
    actions,
  }}
/>

<!-- Sem ninguém para avisar (chamado só de quem abriu, sem responsável): o campo some. -->
<Story name="NobodyToNotify" args={{ data: { ...data, notifiable: [], watcherIds: [] }, state: {}, actions }} />
