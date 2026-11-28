import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Harness from './azuos-table-harness.test.svelte';

describe('AzuosTable', () => {
  // feliz
  it('draws a real table with header, rows and actions', () => {
    render(Harness);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Peça' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Memória 8 GB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver histórico' })).toBeInTheDocument();
  });

  /* A aparência da casa mora aqui, não no `ui/table`: superfície de cartão por fora. */
  it('wraps the table in a card surface', () => {
    const { container } = render(Harness);

    const surface = container.querySelector('[data-slot="table-surface"]');
    expect(surface?.className).toContain('rounded-surface');
    expect(surface?.className).toContain('shadow-card');
  });

  it('shows the footer with the source and the count', () => {
    render(Harness, { props: { hasFooter: true } });

    expect(screen.getByText('Estoque de peças')).toBeInTheDocument();
    expect(screen.getByText('1 peça')).toBeInTheDocument();
  });

  /* Texto comprido quebra na célula; só a célula de ações fica numa linha só. */
  it('lets cell text wrap and keeps the screen class', () => {
    render(Harness, { props: { cellClass: 'font-medium' } });

    const cell = screen.getByRole('cell', { name: 'Memória 8 GB' });
    expect(cell.className).toContain('whitespace-normal');
    expect(cell.className).toContain('font-medium');
  });

  // triste
  it('draws no footer when the screen gives none', () => {
    render(Harness);

    expect(screen.queryByText('Estoque de peças')).toBeNull();
  });

  it('lets the screen drop the surface when the table already lives in a card', () => {
    const { container } = render(Harness, {
      props: { containerClass: 'rounded-none border-0 shadow-none' },
    });

    const surface = container.querySelector('[data-slot="table-surface"]');
    expect(surface?.className).toContain('rounded-none');
    expect(surface?.className).not.toContain('rounded-surface');
  });

  // feliz
  /* A ação da linha é a coluna estreita presa à direita, e o clique nela não abre a linha. */
  it('keeps the row actions in a narrow sticky column that does not open the row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(Harness, { props: { onRowClick } });

    const button = screen.getByRole('button', { name: 'Mais ações' });
    const cell = button.closest('[data-slot="table-actions-cell"]');
    expect(cell?.className).toContain('table-sticky-end');
    expect(cell?.className).toContain('w-px');
    await user.click(button);

    expect(onRowClick).not.toHaveBeenCalled();
    const head = document.querySelector('[data-slot="table-actions-head"]');
    expect(head).toHaveTextContent('Ações');
    expect(head?.querySelector('.sr-only')).not.toBeNull();
  });

  // feliz
  it('cuts long cell text in one line, with the column ceiling', () => {
    const { container } = render(Harness);

    const text = container.querySelector('[data-slot="table-text"] > span');
    expect(text).toHaveTextContent('Placa-mãe com nome comprido');
    expect(text?.className).toContain('truncate');
    expect(text?.className).toContain('max-w-72');
  });

  // triste
  it('shows the dash for an empty cell text', () => {
    render(Harness);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('writes the header as a sentence, not in spaced capitals', () => {
    render(Harness);

    const head = screen.getByRole('columnheader', { name: 'Peça' });
    expect(head.className).not.toContain('uppercase');
  });
});
