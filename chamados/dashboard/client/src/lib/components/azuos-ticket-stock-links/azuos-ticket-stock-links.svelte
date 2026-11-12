<script lang="ts" module>
  import { ticketStockDirectionLabel } from '@template/shared/domain/ticket-stock.util';
  import { type TicketStockLink } from '@template/shared/schemas/ticket-stock-item.schema';

  /**
   * OS CHAMADOS ABERTOS que prendem um item do depósito — embaixo do nome do item, na tela do
   * Depósito. Cada um é um link para o chamado: quem vê "3 na prateleira" e um "saída de 2 no
   * CH-0049" sabe que só sobra 1, e onde perguntar.
   *
   * Sem chamado, não desenha nada.
   */
  export type AzuosTicketStockLinksProps = {
    data: {
      links?: TicketStockLink[];
      /** O endereço da fila de chamados do módulo — "/infra/tickets", "/maintenance/tickets". */
      ticketsPath: string;
    };
  };

  /** "saída de 2" — o que o item reservado vai fazer no depósito quando o chamado encerrar. */
  export function describeLink(link: TicketStockLink): string {
    return `${ticketStockDirectionLabel(link.direction).toLowerCase()} de ${link.quantity}`;
  }
</script>

<script lang="ts">
  import TicketIcon from '@lucide/svelte/icons/ticket';

  let { data }: AzuosTicketStockLinksProps = $props();
</script>

{#if data.links && data.links.length > 0}
  <ul class="mt-1 flex flex-col gap-0.5" aria-label="Chamados que reservaram este item">
    {#each data.links as link (`${link.ticketId}-${link.direction}-${link.quantity}`)}
      <li class="text-xs">
        <a
          href={`${data.ticketsPath}/${link.ticketId}`}
          class="text-primary inline-flex items-center gap-1 font-medium hover:underline"
        >
          <TicketIcon class="size-3 shrink-0" aria-hidden="true" />
          No chamado {link.protocol}
        </a>
        <span class="text-muted-foreground">· {describeLink(link)}</span>
      </li>
    {/each}
  </ul>
{/if}
