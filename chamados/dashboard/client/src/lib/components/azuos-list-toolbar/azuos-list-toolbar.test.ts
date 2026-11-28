import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ListToolbar, { listLayoutOf, scrollLabelOf } from './azuos-list-toolbar.svelte';

const base = {
  scroll: { loaded: 30, totalItems: 605 },
  pages: { page: 1, pageSize: 12, totalItems: 605 },
  noun: ['peça', 'peças'] as [string, string],
};

describe('AzuosListToolbar', () => {
  // feliz
  it('shows the pages on the cards and walks to the next one', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(ListToolbar, { props: { data: { ...base, layout: 'card' }, actions: { onPageChange } } });

    expect(screen.getByText('1–12 de 605 peças')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Próxima/ }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  // feliz
  it('shows only the count on the table, which scrolls', () => {
    render(ListToolbar, { props: { data: { ...base, layout: 'table' }, actions: { onPageChange: vi.fn() } } });

    expect(screen.getByText('30 de 605 peças')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Próxima/ })).toBeNull();
  });

  // triste
  /* O pé da tabela é dela: a barra de baixo só aparece nos cartões. */
  it('draws nothing at the bottom of the table', () => {
    const { container } = render(ListToolbar, {
      props: { data: { ...base, layout: 'table' }, ui: { position: 'bottom' }, actions: { onPageChange: vi.fn() } },
    });

    expect(container.textContent?.trim()).toBe('');
  });

  it('picks the cards below the monitor and when the person prefers them', () => {
    expect(listLayoutOf({ forceCards: false, isNarrow: false })).toBe('table');
    expect(listLayoutOf({ forceCards: true, isNarrow: false })).toBe('card');
    expect(listLayoutOf({ forceCards: false, isNarrow: true })).toBe('card');
    expect(scrollLabelOf({ loaded: 1, totalItems: 1 }, ['peça', 'peças'])).toBe('1 de 1 peça');
  });
});
