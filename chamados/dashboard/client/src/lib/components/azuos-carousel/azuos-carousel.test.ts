import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Harness from './azuos-carousel-harness.test.svelte';

describe('AzuosCarousel', () => {
  // feliz
  it('is a named strip with every item and the two arrows in Portuguese', () => {
    render(Harness, { props: { items: ['Abertos', 'Aguardando', 'Resolvidos'] } });

    expect(screen.getByRole('region', { name: 'Resumo por situação' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Ver anteriores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver próximos' })).toBeInTheDocument();
  });

  // triste
  it('draws an empty strip, without breaking, when there is nothing to show', () => {
    render(Harness, { props: { items: [] } });

    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Ver anteriores' })).toBeDisabled();
  });
});
