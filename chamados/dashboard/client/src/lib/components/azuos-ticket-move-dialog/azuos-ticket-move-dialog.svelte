<!--
  @component
  MOVER UM CHAMADO NO QUADRO QUANDO O ESTÁGIO PEDE TEXTO — o diálogo que abre ao soltar um cartão em
  "Resolvido" (a solução), "Encerrado com ressalva" (o que ficou por fazer), "Cancelado" (o motivo),
  numa das colunas "Aguardando" (por quem se espera, e o quê) ou um encerrado em "Em atendimento"
  (por que reabrir).

  Dentro, o MESMO formulário de histórico da ficha do chamado (`AzuosTicketHistoryForm`), já no tipo
  que leva ao estágio da coluna de destino (só ele, sem escolha — a não ser que o catálogo tenha mais
  de um tipo para o mesmo estágio): mover no quadro é lançar um histórico, com as mesmas regras
  e o mesmo texto obrigatório. O cartão só muda de coluna quando o histórico é registrado; "Cancelar"
  (ou Esc, ou o X) fecha sem registrar nada, e o cartão fica onde estava.

  Função pura de props. `data` traz o protocolo, o título da coluna de destino e o `data` do
  formulário; `state` se está aberto e o `state` do formulário; `actions` o `onCancel` e as ações do
  formulário. Enquanto registra, fechar não fecha: a requisição já saiu.
-->
<script lang="ts" module>
  import { type AzuosTicketHistoryFormProps } from '$lib/components/azuos-ticket-history-form/azuos-ticket-history-form.svelte';

  export type AzuosTicketMoveDialogProps = {
    data: {
      protocol: string;
      targetTitle: string;
      form: AzuosTicketHistoryFormProps['data'];
    };
    state: {
      isOpen: boolean;
      form?: AzuosTicketHistoryFormProps['state'];
    };
    actions: {
      onCancel: () => void;
      form: AzuosTicketHistoryFormProps['actions'];
    };
  };
</script>

<script lang="ts">
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import TicketHistoryForm from '$lib/components/azuos-ticket-history-form/azuos-ticket-history-form.svelte';

  let { data, state: dialogState, actions }: AzuosTicketMoveDialogProps = $props();

  const isSubmitting = $derived(Boolean(dialogState.form?.isSubmitting));

  function close() {
    if (isSubmitting) return;

    actions.onCancel();
  }
</script>

<Dialog open={dialogState.isOpen} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : close())}>
  <DialogContent class="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Mover {data.protocol} para "{data.targetTitle}"</DialogTitle>
      <DialogDescription>
        Mudar a etapa é registrar um histórico, como na ficha do chamado. O cartão só muda de coluna
        depois de registrar.
      </DialogDescription>
    </DialogHeader>

    <TicketHistoryForm data={data.form} state={dialogState.form} actions={actions.form} />

    <DialogFooter>
      <ActionButton
        data={{ label: 'Cancelar' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: isSubmitting }}
        actions={{ onClick: close }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
