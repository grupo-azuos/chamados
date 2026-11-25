import Printer from '@lucide/svelte/icons/printer';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ContentCard, {
  accessibleNameOf,
  alertCountLabel,
  metricColumnsOf,
} from './azuos-content-card.svelte';

const base = {
  label: 'Abrir o chamado CH-0042',
  title: 'Ana Prado',
  code: 'CH-0042',
  meta: 'Fiscal',
};

describe('the record card helpers', () => {
  // feliz
  it('lays one column per number and cuts the badge at 99', () => {
    expect(metricColumnsOf(3)).toBe('grid-cols-3');
    expect(alertCountLabel(7)).toBe('7');
  });

  // triste
  it('keeps the row between one and four columns and never shows a long number', () => {
    expect(metricColumnsOf(0)).toBe('grid-cols-1');
    expect(metricColumnsOf(9)).toBe('grid-cols-4');
    expect(alertCountLabel(140)).toBe('99+');
  });
});

describe('AzuosContentCard', () => {
  // feliz
  it('shows the strip, the header, the numbers and the footer, and opens the record', async () => {
    const onOpen = vi.fn();
    const { container } = render(ContentCard, {
      props: {
        data: {
          ...base,
          status: { label: 'Em andamento', tone: 'info' },
          tags: [{ label: 'Alta', tone: 'warning' }],
          metrics: [
            { key: 'area', label: 'Área', value: 'Infra' },
            { key: 'machines', label: 'Máquinas', value: '2', tone: 'blue' },
          ],
          footer: {
            title: 'Carlos Lima',
            subtitle: 'Aberto em 20/11/2026',
            person: { name: 'Carlos Lima' },
          },
          openLabel: 'Abrir',
        },
        ui: { icon: Printer, iconTone: 'info', iconLabel: 'Impressora' },
        actions: { onOpen },
      },
    });

    expect(screen.getByRole('heading', { name: 'Ana Prado' })).toBeInTheDocument();
    expect(screen.getByText('CH-0042')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Impressora' })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="content-card-machines"]')).toHaveTextContent('2');
    expect(screen.getByText('CL')).toBeInTheDocument();
    expect(screen.getByText('Abrir')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o chamado CH-0042' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  // feliz
  it('pulses the badge of a pending record and puts row actions in the menu', async () => {
    const onMenuSelect = vi.fn();
    render(ContentCard, {
      props: {
        data: {
          ...base,
          alert: { count: 3, message: '3 pendências' },
          menu: { label: 'Ações de Ana Prado', items: [{ id: 'edit', label: 'Editar' }] },
        },
        actions: { onMenuSelect },
      },
    });

    expect(screen.getByRole('img', { name: '3 pendências' })).toHaveTextContent('3');
    await userEvent.click(screen.getByRole('button', { name: 'Ações de Ana Prado' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(onMenuSelect).toHaveBeenCalledWith('edit');
  });

  // feliz
  it('opens the code link in a new tab and shows the photo in place of the icon', () => {
    render(ContentCard, {
      props: {
        data: { ...base, code: 'azuos/chamados', codeHref: 'https://github.com/azuos/chamados' },
        ui: { thumbnailUrl: '/photos/cadeira.png', icon: Printer },
      },
    });

    const link = screen.getByRole('link', { name: 'azuos/chamados' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('img', { name: 'Foto de Ana Prado' })).toHaveAttribute(
      'src',
      '/photos/cadeira.png',
    );
  });

  // triste
  it('draws no strip, no badge, no pill and no button when there is nothing to say or open', () => {
    const { container } = render(ContentCard, {
      props: {
        data: {
          ...base,
          alert: { count: 0, message: 'nada' },
          openLabel: 'Abrir',
          menu: { label: 'Ações', items: [] },
        },
      },
    });

    expect(container.querySelector('[data-slot="content-card-strip"]')).toBeNull();
    expect(container.querySelector('[data-slot="content-card-footer"]')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Abrir')).toBeNull();
  });

  // triste
  it('turns the dot off for a zero and keeps the number in the text color', () => {
    const { container } = render(ContentCard, {
      props: {
        data: {
          ...base,
          metrics: [{ key: 'alerts', label: 'Alertas', value: '0', tone: 'red', isOn: false }],
        },
      },
    });

    const cell = container.querySelector('[data-slot="content-card-alerts"]')!;
    expect(cell.querySelector('.bg-border')).not.toBeNull();
    expect(cell.querySelector('.bg-hue-red')).toBeNull();
    expect(cell.querySelector('.text-foreground')).toHaveTextContent('0');
  });
});

describe('AzuosContentCard — painel e bloco', () => {
  // feliz
  /* O card de painel é o mesmo card: o número grande abaixo do cabeçalho, e clicável vira filtro. */
  it('works as the dashboard card: the big number, the filter and the chosen state', async () => {
    const onOpen = vi.fn();
    const { container } = render(ContentCard, {
      props: {
        data: {
          label: 'Abertos',
          title: 'Abertos',
          highlight: { value: 12, hint: 'exclui 3 arquivados' },
        },
        ui: { icon: Printer, iconTone: 'blue' },
        state: { isSelected: true },
        actions: { onOpen },
      },
    });

    expect(container.querySelector('[data-slot="content-card-highlight"]')).toHaveTextContent(
      '12 exclui 3 arquivados',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abertos 12: tirar o filtro' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  // feliz
  it('works as the content block: free body, the tools in the corner and no header without title', () => {
    render(ContentCard, {
      props: {
        data: { label: 'Receitas', title: 'Receitas por mês', meta: 'Os últimos 12 meses' },
        body: createRawSnippet(() => ({ render: () => '<p>gráfico</p>' })),
        tools: createRawSnippet(() => ({ render: () => '<button type="button">Semana</button>' })),
      },
    });

    expect(screen.getByText('gráfico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
    /* O título cortado mostra o inteiro no balão do projeto, nunca no `title` do navegador. */
    expect(screen.queryByTitle('Receitas por mês')).toBeNull();
  });

  // triste
  it('shows the skeleton instead of the number while it loads, and does not open', () => {
    const { container } = render(ContentCard, {
      props: {
        data: { label: 'Abertos', title: 'Abertos', highlight: { value: 12 } },
        state: { isLoading: true },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(container.querySelector('[data-slot="content-card-highlight"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Abertos 12: filtrar a lista' })).toBeDisabled();
  });

  // triste
  it('keeps the plain name when the card is not a filter', () => {
    expect(
      accessibleNameOf({ label: 'Máquina', title: 'Máquina' }, undefined, { onOpen: vi.fn() }),
    ).toBe('Máquina');
    expect(
      accessibleNameOf(
        { label: 'Abertos', title: 'Abertos', highlight: { value: 3 } },
        undefined,
        undefined,
      ),
    ).toBe('Abertos');
  });
});
