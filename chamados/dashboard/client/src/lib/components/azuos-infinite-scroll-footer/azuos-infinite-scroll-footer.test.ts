import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Footer, { nounFor } from './azuos-infinite-scroll-footer.svelte';

const noun = { singular: 'chamado', plural: 'chamados' };

describe('AzuosInfiniteScrollFooter', () => {
  // feliz
  it('counts what was loaded and loads more on click', async () => {
    const onLoadMore = vi.fn();
    render(Footer, {
      props: {
        data: { loaded: 50, totalItems: 120 },
        ui: { itemNoun: noun },
        state: { isLoading: false, hasMore: true },
        actions: { onLoadMore },
      },
    });

    expect(screen.getByText('50 de 120 chamados')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('says the list is over, with no button, on the last page', () => {
    render(Footer, {
      props: {
        data: { loaded: 1, totalItems: 1 },
        ui: { itemNoun: noun },
        state: { isLoading: false, hasMore: false },
        actions: { onLoadMore: vi.fn() },
      },
    });

    expect(screen.getByText('1 chamado — fim da lista')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // triste
  it('does not ask for the same page twice while it is loading', async () => {
    const onLoadMore = vi.fn();
    render(Footer, {
      props: {
        data: { loaded: 50, totalItems: 120 },
        state: { isLoading: true, hasMore: true },
        actions: { onLoadMore },
      },
    });

    await userEvent.click(screen.getByRole('button'));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('counts with no noun when none was given', () => {
    expect(nounFor(3)).toBe('');
  });
});
