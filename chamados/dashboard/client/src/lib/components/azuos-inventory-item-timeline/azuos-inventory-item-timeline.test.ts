import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import Timeline, {
  formatEventDateTime,
} from './azuos-inventory-item-timeline.svelte';

const sampleEvent = {
  id: 1,
  itemId: 10,
  type: 'defeito' as const,
  description: 'Pé quebrado',
  authorName: 'Ana Silva',
  createdBy: 'ana@empresa.com.br',
  createdAt: '2026-11-05T12:00:00.000Z',
};

describe('AzuosInventoryItemTimeline', () => {
  it('formats date and time properly', () => {
    const formatted = formatEventDateTime('2026-11-05T12:00:00.000Z');
    expect(formatted).toContain('05/11/2026');
  });

  it('renders empty message when no events exist', () => {
    render(Timeline, {
      props: {
        data: { events: [], type: 'observacao', description: '' },
      },
    });

    expect(
      screen.getByText('Nenhuma ocorrência registrada ainda para este produto.'),
    ).toBeInTheDocument();
  });

  it('renders events with badge, author, and description', () => {
    render(Timeline, {
      props: {
        data: { events: [sampleEvent], type: 'observacao', description: '' },
      },
    });

    expect(screen.getByText('Defeito')).toBeInTheDocument();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Pé quebrado')).toBeInTheDocument();
  });

  it('triggers onSubmit on form submit', async () => {
    const onSubmit = vi.fn();
    render(Timeline, {
      props: {
        data: { events: [], type: 'observacao', description: 'Nova nota' },
        actions: { onSubmit },
      },
    });

    const submitBtn = screen.getByRole('button', { name: /registrar ocorrência/i });
    await fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalled();
  });
});
