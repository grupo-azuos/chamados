import Server from '@lucide/svelte/icons/server';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import DashboardHeroCard from './azuos-dashboard-hero-card.svelte';

describe('AzuosDashboardHeroCard', () => {
  // feliz
  it('opens the panel with the sentence, the badge and the numbers', () => {
    render(DashboardHeroCard, {
      props: {
        data: {
          eyebrow: 'Infraestrutura',
          timestamp: 'hoje, 9h',
          title: 'Três chamados esperam resposta',
          badge: '2 urgentes',
          stats: [
            { label: 'Abertos', value: 12 },
            { label: 'Atrasados', value: 3, tone: 'danger' },
          ],
        },
      },
    });

    expect(screen.getByRole('region', { name: 'Infraestrutura' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Três chamados esperam resposta' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 urgentes')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('— hoje, 9h')).toBeInTheDocument();
  });

  it('turns a number with an action into a button', async () => {
    const onClick = vi.fn();
    render(DashboardHeroCard, {
      props: { data: { title: 'Painel', stats: [{ label: 'Atrasados', value: 3, onClick }] } },
    });

    await userEvent.click(screen.getByRole('button', { name: /Atrasados/ }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  // triste
  it('is named by the title and draws no number grid when there are no numbers', () => {
    const { container } = render(DashboardHeroCard, {
      props: { data: { title: 'Bom dia', stats: [] } },
    });

    expect(screen.getByRole('region', { name: 'Bom dia' })).toBeInTheDocument();
    expect(container.querySelector('.grid')).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('AzuosDashboardHeroCard — icons, hints, description and what goes below', () => {
  // feliz
  it('draws the icon of the eyebrow and of each number, the hint, the description and the children', () => {
    render(DashboardHeroCard, {
      props: {
        data: {
          eyebrow: 'Infraestrutura',
          eyebrowIcon: Server,
          title: 'Painel',
          description: 'O que pede atenção hoje.',
          zuzu: { pose: 'alert', size: 96 },
          stats: [{ label: 'Máquinas', value: 7, hint: 'no parque', icon: Server, tone: 'success' }],
        },
        children: createRawSnippet(() => ({ render: () => '<p>ação do painel</p>' })),
      },
    });

    expect(screen.getByText('O que pede atenção hoje.')).toBeInTheDocument();
    expect(screen.getByText('no parque')).toBeInTheDocument();
    expect(screen.getByText('ação do painel')).toBeInTheDocument();
    expect(document.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  // triste
  it('falls back to the default tone for a tone it does not know', () => {
    render(DashboardHeroCard, {
      props: { data: { title: 'Painel', stats: [{ label: 'Outro', value: 1, tone: 'neon' as never }] } },
    });
    expect(screen.getByText('Outro')).toBeInTheDocument();
  });
});
