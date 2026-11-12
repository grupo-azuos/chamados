import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TicketStockLinks, { describeLink } from './azuos-ticket-stock-links.svelte';

const link = { ticketId: 49, protocol: 'CH-0049', direction: 'out' as const, quantity: 2 };

describe('AzuosTicketStockLinks', () => {
  // feliz
  it('links each open ticket that holds the item', () => {
    render(TicketStockLinks, { data: { links: [link], ticketsPath: '/infra/tickets' } });

    expect(screen.getByRole('link', { name: /No chamado CH-0049/ })).toHaveAttribute(
      'href',
      '/infra/tickets/49',
    );
    expect(screen.getByText('· saída de 2')).toBeInTheDocument();
  });

  it('says what a return will do', () => {
    expect(describeLink({ ...link, direction: 'in', quantity: 1 })).toBe('entrada de 1');
  });

  // triste
  it('draws nothing when no ticket holds the item', () => {
    const { container } = render(TicketStockLinks, {
      data: { links: [], ticketsPath: '/infra/tickets' },
    });

    expect(container.querySelector('ul')).toBeNull();
  });
});
