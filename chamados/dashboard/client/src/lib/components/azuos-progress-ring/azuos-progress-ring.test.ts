import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ProgressRing, { ringPercentage, ringTone } from './azuos-progress-ring.svelte';

describe('AzuosProgressRing', () => {
  // feliz
  it('shows the rounded percentage in the middle and to screen readers', () => {
    render(ProgressRing, { props: { data: { done: 2, total: 3 } } });

    const ring = screen.getByRole('progressbar', { name: 'Entregue: 2 de 3 itens' });
    expect(ring).toHaveAttribute('aria-valuenow', '67');
    expect(ring).toHaveTextContent('67%');
  });

  it('follows the progress bar colour bands', () => {
    expect(ringTone(10, 100)).toBe('success');
    expect(ringTone(10, 70)).toBe('warning');
    expect(ringTone(10, 40)).toBe('alert');
    expect(ringTone(10, 39)).toBe('danger');
  });

  // triste
  it('says "—" in grey, and not 0% in red, when there is nothing to deliver', () => {
    render(ProgressRing, { props: { data: { done: 0, total: 0 } } });

    expect(screen.getByRole('progressbar')).toHaveTextContent('—');
    expect(ringTone(0, 0)).toBe('empty');
  });

  it('never goes past 100% nor below 0%', () => {
    expect(ringPercentage(12, 10)).toBe(100);
    expect(ringPercentage(-3, 10)).toBe(0);
  });
});
