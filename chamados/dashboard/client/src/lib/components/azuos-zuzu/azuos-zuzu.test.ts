import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Zuzu from './azuos-zuzu.svelte';

function image(): HTMLImageElement {
  /* `getByRole('img')` não acha: a imagem é `aria-hidden`, e é esse o ponto do teste abaixo. */
  const found = document.querySelector('img');
  if (!found) throw new Error('o Zuzu não desenhou');

  return found;
}

describe('AzuosZuzu', () => {
  // feliz
  it('draws the requested pose', () => {
    render(Zuzu, { props: { data: { pose: 'celebrating' } } });

    expect(image().getAttribute('src')).toContain('festejando');
  });

  it('uses the requested size, and 96 when none is given', () => {
    const { unmount } = render(Zuzu, { props: { ui: { size: 40 } } });
    expect(image().getAttribute('width')).toBe('40');
    unmount();

    render(Zuzu);
    expect(image().getAttribute('width')).toBe('96');
  });

  it('still draws when asked to move', () => {
    render(Zuzu, { props: { data: { pose: 'idea', anim: 'float' } } });

    expect(image().getAttribute('src')).toContain('ideia');
  });

  // triste
  /* `alt` vazio e `aria-hidden` são regra de acessibilidade, não detalhe — por isso têm teste. */
  it('is not announced to screen reader users', () => {
    render(Zuzu, { props: { data: { pose: 'idea' } } });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(image()).toHaveAttribute('aria-hidden', 'true');
    expect(image()).toHaveAttribute('alt', '');
  });

  /* Sem pose, ele fica debruçado — e não some. */
  it('falls back to leaning when no pose is given (edge case)', () => {
    render(Zuzu);

    expect(image().getAttribute('src')).toContain('debrucado');
  });
});
