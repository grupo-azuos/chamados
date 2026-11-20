import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';

import Ticket from '@lucide/svelte/icons/ticket';

import PageHeader from './azuos-page-header.svelte';

describe('AzuosPageHeader', () => {
  // feliz
  it('renders the title as the page heading', () => {
    render(PageHeader, {
      props: {
        data: { title: 'Chamados' },
      },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Chamados' })).toBeInTheDocument();
  });

  it('renders the actions it receives', () => {
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Novo chamado</button>',
    }));

    render(PageHeader, {
      props: {
        data: { title: 'Chamados' },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Novo chamado' })).toBeInTheDocument();
  });

  // triste
  it('does not draw an empty description line when there is none', () => {
    const { container } = render(PageHeader, {
      props: {
        data: { title: 'Chamados' },
      },
    });

    expect(container.querySelector('p')).toBeNull();
  });

  it('puts the menu icon beside a bigger title on a work screen', () => {
    const { container } = render(PageHeader, {
      props: { data: { title: 'Chamados' }, ui: { icon: Ticket } },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Chamados' })).toHaveClass('text-2xl');
    expect(container.querySelector('h1 svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
