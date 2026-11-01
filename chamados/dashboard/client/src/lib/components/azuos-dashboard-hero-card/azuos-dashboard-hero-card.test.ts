import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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
