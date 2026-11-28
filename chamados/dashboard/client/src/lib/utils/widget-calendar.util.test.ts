import { describe, expect, it } from 'vitest';

import { dayCountEvents } from './widget-calendar.util';

describe('dayCountEvents', () => {
  // feliz
  it('writes one event per day with something, the count in the title', () => {
    const events = dayCountEvents(
      [
        { key: '2026-11-20', value: 3 },
        { key: '2026-11-21', value: 1 },
      ],
      'chamados',
    );

    expect(events).toEqual([
      { id: '2026-11-20', title: '3 chamados', start: '2026-11-20' },
      { id: '2026-11-21', title: '1 chamados', start: '2026-11-21' },
    ]);
  });

  // feliz
  it('paints the busiest day in the strongest heat', () => {
    const [low, high] = dayCountEvents(
      [
        { key: '2026-11-20', value: 1 },
        { key: '2026-11-21', value: 8 },
      ],
      'chamados',
      { heat: true },
    );

    expect(low?.color).toBe('var(--brand-yellow-300)');
    expect(high?.color).toBe('var(--destructive)');
    expect(high?.contrastColor).toBe('var(--white)');
  });

  // triste
  it('leaves out the empty days', () => {
    expect(dayCountEvents([{ key: '2026-11-20', value: 0 }], 'chamados')).toEqual([]);
  });
});
