import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TruncatedText, { isClipped } from './azuos-truncated-text.svelte';

/** Uma caixa com medidas fingidas: o jsdom não faz layout, então tudo mede zero. */
function box(sizes: {
  scrollWidth: number;
  clientWidth: number;
  scrollHeight?: number;
  clientHeight?: number;
}) {
  const element = document.createElement('span');
  for (const [key, value] of Object.entries({ scrollHeight: 0, clientHeight: 0, ...sizes })) {
    Object.defineProperty(element, key, { value });
  }

  return element;
}

describe('AzuosTruncatedText', () => {
  // feliz
  it('shows the text itself in the cell', () => {
    render(TruncatedText, {
      props: { data: { text: 'Troca de fonte da impressora' }, ui: { className: 'truncate' } },
    });

    expect(screen.getByText('Troca de fonte da impressora')).toHaveClass('truncate');
  });

  it('counts as clipped when the content is wider or taller than the box', () => {
    expect(isClipped(box({ scrollWidth: 300, clientWidth: 120 }))).toBe(true);
    expect(
      isClipped(box({ scrollWidth: 100, clientWidth: 100, scrollHeight: 60, clientHeight: 40 })),
    ).toBe(true);
  });

  // triste
  it('does not count as clipped when the text fits, or when there is no element', () => {
    expect(isClipped(box({ scrollWidth: 80, clientWidth: 120 }))).toBe(false);
    expect(isClipped(null)).toBe(false);
  });

  it('opens no tooltip before anyone points at it', () => {
    render(TruncatedText, { props: { data: { text: 'Aguardando' } } });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
