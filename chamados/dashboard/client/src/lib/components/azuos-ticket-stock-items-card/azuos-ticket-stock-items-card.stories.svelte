<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import TicketStockItemsCard from './azuos-ticket-stock-items-card.svelte';

  const line = (id: number, name: string, direction: 'in' | 'out', computerId: number | null, computerName: string | null) => ({
    id,
    ticketId: 49,
    source: 'parts' as const,
    itemId: id,
    name,
    direction,
    quantity: 1,
    computerId,
    computerName,
    settledAt: null,
    createdAt: '2026-11-12T12:00:00.000Z',
    createdByName: 'Ana Lima',
  });
  const items = [
    line(10, 'Monitor 24"', 'out', 6, 'Computador 06'),
    line(11, 'Monitor 24"', 'out', 6, 'Computador 06'),
    line(12, 'Monitor 22" com a tela de cor trocada, devolvido para conserto', 'in', 6, 'Computador 06'),
    line(13, 'Cabo HDMI', 'out', null, null),
  ];
  const actions = { onOpenLink: fn(), onRemove: fn() };

  /**
   * Os itens de estoque do chamado POR MÁQUINA (1 máquina para vários itens): "Computador 06 →
   * Monitor 24", Monitor 22"". "Vincular itens" abre o diálogo de dois lados.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosTicketStockItemsCard',
    component: TicketStockItemsCard,
    tags: ['autodocs'],
  });
</script>

<Story name="Default" args={{ data: { items }, ui: { shelfLabel: 'Depósito da TI' }, actions }} />
<Story name="Vazio" args={{ data: { items: [] }, actions }} />
<Story name="Encerrado" args={{ data: { items }, state: { isClosed: true }, actions }} />
<Story name="Recusa do servidor" args={{ data: { items }, state: { error: 'Só há 1 de Monitor 24" disponível no depósito.' }, actions }} />
