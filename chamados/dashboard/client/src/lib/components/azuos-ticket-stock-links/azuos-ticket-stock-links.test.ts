import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import TicketStockLinks, { describeLink, summarizeLinks } from './azuos-ticket-stock-links.svelte';

const link = { ticketId: 49, protocol: 'CH-0049', direction: 'out' as const, quantity: 1 };

describe('summarizeLinks', () => {
  // feliz
  it('tells what is reserved, what is left and in how many tickets', () => {
    const links = [link, { ...link, ticketId: 50, protocol: 'CH-0050', quantity: 2 }];

    expect(summarizeLinks(links, 11)).toEqual({ reserved: 3, returning: 0, available: 8, tickets: 2 });
  });

  it('counts what is coming back apart', () => {
    expect(summarizeLinks([{ ...link, direction: 'in' }], 0)).toMatchObject({
      reserved: 0,
      returning: 1,
    });
  });

  // triste
  it('never shows less than zero available', () => {
    expect(summarizeLinks([{ ...link, quantity: 5 }], 1).available).toBe(0);
  });
});

describe('AzuosTicketStockLinks', () => {
  // feliz
  it('shows one line for many tickets, and lists them with links when opened', async () => {
    const links = Array.from({ length: 10 }, (_, index) => ({
      ...link,
      ticketId: 40 + index,
      protocol: `CH-00${40 + index}`,
    }));
    render(TicketStockLinks, { data: { links, balance: 11, ticketsPath: '/infra/tickets' } });

    expect(screen.getByText('10 reservadas')).toBeInTheDocument();
    expect(screen.getByText('1 disponível')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Em 10 chamados/ }));

    expect(await screen.findByRole('link', { name: /CH-0049/ })).toHaveAttribute(
      'href',
      '/infra/tickets/49',
    );
  });

  it('says what a return will do', () => {
    expect(describeLink({ ...link, direction: 'in' })).toBe('entrada de 1');
  });

  // triste
  it('draws nothing when no ticket holds the item', () => {
    const { container } = render(TicketStockLinks, {
      data: { links: [], balance: 3, ticketsPath: '/infra/tickets' },
    });

    expect(container.textContent?.trim()).toBe('');
  });
});
