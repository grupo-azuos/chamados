<script lang="ts" module>
  import {
    canRetryWhatsappNotice,
    WHATSAPP_NOTICE_FAILURE_MESSAGES,
    WHATSAPP_NOTICE_KIND_LABELS,
    WHATSAPP_NOTICE_STATUS_LABELS,
    WHATSAPP_NOTICE_STATUS_TONES,
    type WhatsappNotice,
  } from '@template/shared/schemas/whatsapp-notice.schema';

  /**
   * OS AVISOS DE WHATSAPP DE UM CHAMADO — saíram, estão na fila ou pararam, e por quê.
   *
   * O aviso não sai na hora: entra numa fila e o servidor o entrega em seguida, tentando de
   * novo quando o WhatsApp está fora. Esta lista é o que mostra a quem atende o que aconteceu
   * com ele — e, quando parou, oferece mandar de novo.
   *
   * Função pura de props. Sem aviso nenhum, não desenha nada: a maior parte dos chamados não
   * pediu aviso, e um quadro vazio em cada ficha seria ruído.
   */
  export type AcerolaWhatsappNoticeListProps = {
    data: {
      /** Do mais novo para o mais antigo. */
      notices: WhatsappNotice[];
    };
    state?: {
      /** Qual aviso está sendo reenviado — trava só a linha dele. */
      retryingId?: number | null;
      error?: string | null;
    };
    actions?: {
      /** Ausente quando quem olha não pode reenviar: o botão não aparece. */
      onRetry?: (notice: WhatsappNotice) => void;
    };
  };

  /** A linha de detalhe: quando saiu, ou por que não saiu e quantas tentativas. */
  export function noticeDetailOf(notice: WhatsappNotice): string {
    if (notice.status === 'sent' && notice.sentAt) {
      return `Saiu em ${new Date(notice.sentAt).toLocaleString('pt-BR')}`;
    }

    const reason = notice.failureReason ? WHATSAPP_NOTICE_FAILURE_MESSAGES[notice.failureReason] : null;
    if (notice.status === 'pending') {
      return reason ? `Tentando de novo. Última falha: ${reason}` : 'Sai em instantes.';
    }

    return reason ?? 'Não saiu.';
  }
</script>

<script lang="ts">
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';

  let { data, state: viewState, actions }: AcerolaWhatsappNoticeListProps = $props();
</script>

{#if data.notices.length > 0}
  <section class="flex flex-col gap-2" aria-label="Avisos por WhatsApp">
    <h2 class="text-ink-900 text-sm font-semibold">Avisos por WhatsApp</h2>

    {#if viewState?.error}
      <p role="alert" class="text-destructive text-sm">{viewState.error}</p>
    {/if}

    <ul class="divide-y rounded-box border">
      {#each data.notices as notice (notice.id)}
        <li class="flex items-center justify-between gap-3 p-2.5">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-ink-900 text-sm">{WHATSAPP_NOTICE_KIND_LABELS[notice.kind]}</p>
              <StatusBadge
                data={{ label: WHATSAPP_NOTICE_STATUS_LABELS[notice.status] }}
                ui={{ tone: WHATSAPP_NOTICE_STATUS_TONES[notice.status], size: 'sm' }}
              />
            </div>
            <p class="text-ink-500 text-xs">{noticeDetailOf(notice)}</p>
          </div>

          {#if actions?.onRetry && canRetryWhatsappNotice(notice.status)}
            <ActionButton
              data={{ label: 'Reenviar', loadingLabel: 'Reenviando…' }}
              ui={{ variant: 'secondary', size: 'sm', icon: RotateCcw }}
              state={{ isLoading: viewState?.retryingId === notice.id }}
              actions={{ onClick: () => actions?.onRetry?.(notice) }}
            />
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
