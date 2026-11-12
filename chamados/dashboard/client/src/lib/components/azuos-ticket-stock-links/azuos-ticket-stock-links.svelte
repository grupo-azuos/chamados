<script lang="ts" module>
  import { availableForTicket, ticketStockDirectionLabel } from '@template/shared/domain/ticket-stock.util';
  import { type TicketStockLink } from '@template/shared/schemas/ticket-stock-item.schema';

  /**
   * O que os CHAMADOS ABERTOS fazem com um item do depósito — embaixo do saldo, na tela do
   * Depósito.
   *
   * O saldo da prateleira só anda quando o chamado encerra. Até lá, quem olha "1 na prateleira"
   * precisa saber que aquela uma já está prometida: por isso a linha diz quanto está reservado
   * e quanto ainda está disponível. Os chamados não se empilham no cartão — com dez chamados ele
   * ficaria maior que a tela. Um botão diz em quantos, e a lista abre num balão, com o link de
   * cada um.
   *
   * Sem chamado, não desenha nada.
   */
  export type AzuosTicketStockLinksProps = {
    data: {
      links?: TicketStockLink[];
      /** O saldo da prateleira — de onde sai o "disponível". */
      balance: number;
      /** O endereço da fila de chamados do módulo — "/infra/tickets", "/maintenance/tickets". */
      ticketsPath: string;
    };
  };

  /** "saída de 2" — o que o item reservado vai fazer no depósito quando o chamado encerrar. */
  export function describeLink(link: TicketStockLink): string {
    return `${ticketStockDirectionLabel(link.direction).toLowerCase()} de ${link.quantity}`;
  }

  /** O resumo da linha: reservado para sair, o que sobra, e o que ainda vai voltar. */
  export function summarizeLinks(links: readonly TicketStockLink[], balance: number) {
    const reserved = sumOf(links, 'out');
    const returning = sumOf(links, 'in');
    const tickets = new Set(links.map((link) => link.ticketId)).size;

    return { reserved, returning, available: availableForTicket(balance, reserved), tickets };
  }

  function sumOf(links: readonly TicketStockLink[], direction: TicketStockLink['direction']): number {
    return links
      .filter((link) => link.direction === direction)
      .reduce((total, link) => total + link.quantity, 0);
  }
</script>

<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import TicketIcon from '@lucide/svelte/icons/ticket';

  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/azuos-popover/azuos-popover';

  let { data }: AzuosTicketStockLinksProps = $props();

  const links = $derived(data.links ?? []);
  const summary = $derived(summarizeLinks(links, data.balance));
</script>

{#if links.length > 0}
  <div class="mt-1 flex flex-col gap-1 text-xs">
    <p class="text-ink-700">
      {#if summary.reserved > 0}
        <span class="font-medium">{summary.reserved} reservada{summary.reserved === 1 ? '' : 's'}</span>
        <span class="text-muted-foreground">·</span>
        <span class={summary.available === 0 ? 'text-destructive font-medium' : 'font-medium'}>
          {summary.available} disponíve{summary.available === 1 ? 'l' : 'is'}
        </span>
      {/if}
      {#if summary.returning > 0}
        {#if summary.reserved > 0}<span class="text-muted-foreground">·</span>{/if}
        <span class="font-medium">{summary.returning} a voltar</span>
      {/if}
    </p>

    <Popover>
      <PopoverTrigger
        class="text-primary inline-flex w-fit cursor-pointer items-center gap-1 font-medium hover:underline"
      >
        <TicketIcon class="size-3 shrink-0" aria-hidden="true" />
        Em {summary.tickets} chamado{summary.tickets === 1 ? '' : 's'}
        <ChevronDownIcon class="size-3 shrink-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent class="w-64 p-1" align="start">
        <ul class="max-h-72 overflow-y-auto" aria-label="Chamados que reservaram este item">
          {#each links as link, index (`${link.ticketId}-${link.direction}-${index}`)}
            <li>
              <a
                href={`${data.ticketsPath}/${link.ticketId}`}
                class="hover:bg-muted/60 flex min-h-10 items-center justify-between gap-2 rounded-chip px-3 py-2 text-sm"
              >
                <span class="text-primary font-medium">{link.protocol}</span>
                <span class="text-muted-foreground text-xs">{describeLink(link)}</span>
              </a>
            </li>
          {/each}
        </ul>
      </PopoverContent>
    </Popover>
  </div>
{/if}
