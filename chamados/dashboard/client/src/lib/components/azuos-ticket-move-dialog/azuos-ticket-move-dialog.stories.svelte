<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import {
    ticketHistoryEffect,
    ticketHistoryEffectLabel,
    ticketHistoryTone,
    ticketHistoryTypeLabel,
    type ManualTicketHistoryType,
  } from '@template/shared/domain/ticket-history.util';
  import { fn } from 'storybook/test';

  import TicketMoveDialog, { type AzuosTicketMoveDialogProps } from './azuos-ticket-move-dialog.svelte';

  const formActions: AzuosTicketMoveDialogProps['actions']['form'] = {
    onTypeChange: fn(),
    onChange: fn(),
    onBlur: fn(),
    onVisibilityChange: fn(),
    onNotifyChange: fn(),
    onChosenFilesChange: fn(),
    onAttachmentError: fn(),
    onSubmit: fn(),
  };

  const option = (type: ManualTicketHistoryType) => ({
    value: type,
    label: ticketHistoryTypeLabel(type),
    tone: ticketHistoryTone(type),
  });

  /* O formulário como o arrasto o abre: só os tipos que levam à coluna de destino. */
  function formFor(
    type: ManualTicketHistoryType,
    groups: { continuing: ManualTicketHistoryType[]; closing: ManualTicketHistoryType[] },
  ): AzuosTicketMoveDialogProps['data']['form'] {
    return {
      type,
      groups: { continuing: groups.continuing.map(option), closing: groups.closing.map(option) },
      effect: ticketHistoryEffect(type),
      effectLabel: ticketHistoryEffectLabel(type),
      fields: { description: { value: '', error: null }, minutesSpent: { value: '', error: null } },
      isVisibleToRequester: true,
      chosenFiles: [],
      notifyUserIds: [],
      notifiable: [{ id: 'u-bia', name: 'Bia Costa' }],
    };
  }

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketMoveDialog',
    component: TicketMoveDialog,
  });
</script>

<!-- Soltou em "Concluído": a solução é obrigatória, e as três formas de encerrar ficam à escolha. -->
<Story
  name="Default"
  args={{
    data: {
      protocol: 'CH-0010',
      targetTitle: 'Concluído',
      form: formFor('resolution', { continuing: [], closing: ['resolution', 'closure_with_caveats', 'cancellation'] }),
    },
    state: { isOpen: true },
    actions: { onCancel: fn(), form: formActions },
  }}
/>

<!-- Soltou em "Aguardando": por quem se espera. -->
<Story
  name="Waiting"
  args={{
    data: {
      protocol: 'CH-0011',
      targetTitle: 'Aguardando',
      form: formFor('waiting_requester', { continuing: ['waiting_requester', 'waiting_third_party'], closing: [] }),
    },
    state: { isOpen: true },
    actions: { onCancel: fn(), form: formActions },
  }}
/>

<!-- Um encerrado de volta a "Em atendimento": a reabertura pede o motivo. -->
<Story
  name="Reopening"
  args={{
    data: {
      protocol: 'CH-0004',
      targetTitle: 'Em atendimento',
      form: formFor('reopening', { continuing: ['reopening'], closing: [] }),
    },
    state: { isOpen: true },
    actions: { onCancel: fn(), form: formActions },
  }}
/>

<!-- Registrando: fechar não fecha, e o botão diz que está indo. -->
<Story
  name="Submitting"
  args={{
    data: {
      protocol: 'CH-0010',
      targetTitle: 'Concluído',
      form: formFor('resolution', { continuing: [], closing: ['resolution', 'closure_with_caveats', 'cancellation'] }),
    },
    state: { isOpen: true, form: { isSubmitting: true } },
    actions: { onCancel: fn(), form: formActions },
  }}
/>

<!-- Caso limite: o servidor recusou (quem só consulta não encerra). O diálogo continua aberto. -->
<Story
  name="Refused"
  args={{
    data: {
      protocol: 'CH-0010',
      targetTitle: 'Concluído',
      form: formFor('resolution', { continuing: [], closing: ['resolution', 'closure_with_caveats', 'cancellation'] }),
    },
    state: { isOpen: true, form: { error: 'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.' } },
    actions: { onCancel: fn(), form: formActions },
  }}
/>
