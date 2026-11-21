import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MiniStatCard from './azuos-mini-stat-card.svelte';

describe('AzuosMiniStatCard (Svelte)', () => {
  // feliz
  /* Padrão Apple: o número fica na cor do texto; o tom do status mora na bolinha. */
  it('shows the number in the text colour and the status accent in the dot', () => {
    const { container } = render(MiniStatCard, {
      props: { data: { label: 'Concluído', value: 9 }, ui: { tone: 'green' } },
    });

    expect(screen.getByText('9')).toHaveClass('text-foreground');
    expect(container.querySelector('span[aria-hidden="true"].rounded-full')?.className).toContain(
      'bg-hue-green',
    );
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
  it('falls back to the slate dot without a tone', () => {
    const { container } = render(MiniStatCard, { props: { data: { label: 'Sem status', value: 0 } } });

    expect(container.querySelector('span[aria-hidden="true"].rounded-full')?.className).toContain(
      'bg-hue-slate',
    );
  });

  /* A cor que a pessoa escolheu pinta exata na bolinha, e some quando o card está escolhido. */
  it('paints the dot in the exact colour the person chose, but not when selected', () => {
    const { container, rerender } = render(MiniStatCard, {
      props: { data: { label: 'Projeto', value: 7 }, ui: { tone: '#1d4ed8' } },
    });
    const dot = () => container.querySelector('span[aria-hidden="true"].rounded-full') as HTMLElement;

    expect(dot()).toHaveStyle({ backgroundColor: 'rgb(29, 78, 216)' });
    rerender({ data: { label: 'Projeto', value: 7 }, ui: { tone: '#1d4ed8' }, state: { isSelected: true } });
    expect(dot().getAttribute('style') ?? '').toBe('');
  });
});
