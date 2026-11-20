import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MiniStatCard from './azuos-mini-stat-card.svelte';

describe('AzuosMiniStatCard (Svelte)', () => {
  // feliz
  it('shows the label and the number in the accent of its status', () => {
    render(MiniStatCard, {
      props: { data: { label: 'Concluído', value: 9 }, ui: { tone: 'green' } },
    });

    expect(screen.getByText('9')).toHaveClass('text-hue-green');
  });

  it('filters when clicked and turns light blue when selected', async () => {
    const onClick = vi.fn();
    render(MiniStatCard, {
      props: {
        data: { label: 'Aguardando', value: 6 },
        state: { isSelected: true },
        actions: { onClick },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Aguardando: 6' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('group', { name: 'Aguardando: 6' })).toHaveClass('bg-card-selected');
  });

  // triste
  it('falls back to the slate accent without a tone', () => {
    render(MiniStatCard, { props: { data: { label: 'Sem status', value: 0 } } });

    expect(screen.getByText('0')).toHaveClass('text-hue-slate');
  });

  /* A cor que a pessoa escolheu pinta exata no número, e some quando o card está escolhido. */
  it('paints the number in the exact colour the person chose, but not when selected', () => {
    const { rerender } = render(MiniStatCard, {
      props: { data: { label: 'Projeto', value: 7 }, ui: { tone: '#1d4ed8' } },
    });

    expect(screen.getByText('7')).toHaveStyle({ color: 'rgb(29, 78, 216)' });
    rerender({ data: { label: 'Projeto', value: 7 }, ui: { tone: '#1d4ed8' }, state: { isSelected: true } });
    expect(screen.getByText('7').getAttribute('style') ?? '').toBe('');
  });
});
