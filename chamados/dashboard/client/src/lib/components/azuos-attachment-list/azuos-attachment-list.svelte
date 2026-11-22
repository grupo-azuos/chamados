<script lang="ts" module>
  import { ATTACHMENT_RULES } from '@template/shared/domain/attachment-catalog.util';
  import { canRemoveAttachment } from '@template/shared/domain/attachment-ownership.util';
  import {
    type AttachmentOrigin,
    type TicketAttachment,
  } from '@template/shared/schemas/ticket-attachment.schema';

  /* O rótulo é texto de tela (português); a chave é do contrato (inglês). */
  const ORIGIN_LABELS: Record<AttachmentOrigin, string> = {
    requester: 'enviado por quem abriu',
    support: 'anexado pelo TI',
  };

  export type AzuosAttachmentListProps = {
    data: {
      attachments: TicketAttachment[];
    };
    ui?: {
      /** O texto quando não há nenhum arquivo. Cada tela diz isso do jeito dela. */
      emptyLabel?: string;
      /**
       * DE QUE LADO está quem olha a lista — e, portanto, o que ele pode apagar.
       *
       * Cada lado mexe só no que é dele: o TI vê e baixa o que a pessoa mandou, e não apaga.
       * Sem isso, o botão de excluir apareceria em cima da prova de quem pediu socorro (ver
       * `attachment-ownership.util`).
       *
       * @default 'support'
       */
      actor?: AttachmentOrigin;
    };
    state?: {
      isLoading?: boolean;
      /** Qual está sendo excluído agora — trava só a linha dele, não a lista inteira. */
      removingId?: number | null;
      error?: string | null;
    };
    actions?: {
      /** Ausente quando quem está olhando não pode excluir — é assim na consulta pública. */
      onRemove?: (attachment: TicketAttachment) => void;
    };
  };

  /** O tamanho em palavras. Arquivo é coisa de MB: byte cru não diz nada a ninguém. */
  export function fileSizeOf(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);
    if (megabytes >= 1) return `${megabytes.toFixed(1).replace('.', ',')} MB`;

    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
</script>

<script lang="ts">
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FileLinks from '$lib/components/azuos-file-links/azuos-file-links.svelte';

  let { data, ui, state: viewState, actions }: AzuosAttachmentListProps = $props();

  const actor = $derived(ui?.actor ?? 'support');

  function removeOf(attachment: TicketAttachment): (() => void) | undefined {
    if (!actions?.onRemove || !canRemoveAttachment(attachment.origin, actor)) return undefined;

    return () => actions.onRemove?.(attachment);
  }
</script>

<!-- Estados na frente, conteúdo por último. -->
{#if viewState?.error}
  <ErrorState data={{ title: 'Não consegui excluir o anexo', message: viewState.error }} />
{:else if viewState?.isLoading}
  <p class="text-muted-foreground text-sm">Carregando os anexos…</p>
{:else if data.attachments.length === 0}
  <p class="text-muted-foreground text-sm">{ui?.emptyLabel ?? 'Nenhum arquivo anexado.'}</p>
{:else}
  <!-- Cada arquivo é a linha de arquivo da casa (`AzuosFileLinks` no formato `card`): o ícone do
       tipo, o nome, de quem é, as pílulas de abrir e baixar e, quando pode, a lixeira em
       vermelho. De quem é o arquivo vai ESCRITO na linha: sem isso, a única pista de por que uns
       têm lixeira e outros não seria a ausência dela — e ausência não explica nada. -->
  <ul class="flex flex-col gap-2">
    {#each data.attachments as attachment (attachment.id)}
      <li>
        <FileLinks
          data={{
            fileName: attachment.fileName,
            viewUrl: attachment.viewUrl,
            downloadUrl: attachment.downloadUrl,
            detail: [
              ATTACHMENT_RULES[attachment.kind].label,
              fileSizeOf(attachment.sizeBytes),
              ORIGIN_LABELS[attachment.origin],
            ].join(' · '),
          }}
          ui={{ layout: 'card' }}
          state={{ isRemoving: viewState?.removingId === attachment.id }}
          actions={{ onRemove: removeOf(attachment) }}
        />
      </li>
    {/each}
  </ul>
{/if}
