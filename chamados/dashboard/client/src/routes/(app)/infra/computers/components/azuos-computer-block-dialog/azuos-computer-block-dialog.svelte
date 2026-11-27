<!--
  @component
  BLOQUEAR UMA MÁQUINA — a pergunta, com o motivo junto.

  Tem diálogo próprio, em vez do `ConfirmDialog`, por causa do motivo: bloqueio sem motivo escrito
  vira, meses depois, uma máquina calada que ninguém sabe por que foi desligada. Explica o efeito
  (o agente passa a ser recusado, a máquina continua no inventário com o histórico) e pede o
  motivo. Fechar o diálogo é cancelar.

  Função pura de props: o motivo digitado sai no `onConfirm`. O componente não grava nada.

  - `data.computerName`: a máquina da pergunta.
  - `state`: `isOpen`, `isConfirming` (trava o campo e mostra "Bloqueando…") e `error`.
  - `actions`: `onConfirm(reason)` e `onCancel`.
-->
<script lang="ts" module>
  /**
   * BLOQUEAR UMA MÁQUINA — a pergunta, com o motivo junto.
   *
   * Tem diálogo próprio, em vez do `ConfirmDialog`, por causa do motivo: bloqueio sem motivo
   * escrito vira, meses depois, uma máquina calada que ninguém sabe por que foi desligada — e
   * alguém a desbloqueia "para testar", que é exatamente o que o bloqueio existe para impedir.
   *
   * Função pura de props: o motivo digitado sai no `onConfirm`. O componente não grava nada.
   */
  export type AzuosComputerBlockDialogProps = {
    data: { computerName: string };
    state?: { isOpen?: boolean; isConfirming?: boolean; error?: string | null };
    actions: { onConfirm: (reason: string) => void; onCancel: () => void };
  };
</script>

<script lang="ts">
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import { BLOCK_REASON_MAX_LENGTH } from '@template/shared/schemas/computer.schema';

  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: dialogState, actions }: AzuosComputerBlockDialogProps = $props();

  /* Estado puramente visual: o que está digitado enquanto o diálogo está aberto. */
  let reason = $state('');
</script>

<Dialog
  open={dialogState?.isOpen ?? false}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onCancel())}
>
  <DialogContent showCloseButton={false}>
    <!-- O cabeçalho da casa: título e descrição, sem selo de ícone desenhado à mão. -->
    <DialogHeader>
      <DialogTitle>Bloquear esta máquina?</DialogTitle>
      <DialogDescription>
        O agente de {data.computerName} passa a ser recusado, mesmo com o token certo. Ela para de
        enviar leituras e continua no inventário, com todo o histórico.
      </DialogDescription>
    </DialogHeader>

    <TextAreaField
      data={{
        label: 'Motivo',
        name: 'blockReason',
        value: reason,
        placeholder: 'Por que esta máquina não deve mais enviar dados?',
        maxLength: BLOCK_REASON_MAX_LENGTH,
      }}
      state={{ isDisabled: dialogState?.isConfirming }}
      actions={{ onChange: (value: string) => (reason = value) }}
    />

    {#if dialogState?.error}
      <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
    {/if}

    <DialogFooter>
      <ActionButton
        data={{ label: 'Cancelar' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: dialogState?.isConfirming }}
        actions={{ onClick: actions.onCancel }}
      />
      <ActionButton
        data={{ label: 'Bloquear', loadingLabel: 'Bloqueando…' }}
        ui={{ variant: 'danger', className: 'sm:w-auto' }}
        state={{ isLoading: dialogState?.isConfirming }}
        actions={{ onClick: () => actions.onConfirm(reason) }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
