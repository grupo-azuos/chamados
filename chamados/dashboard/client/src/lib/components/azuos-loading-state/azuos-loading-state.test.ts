import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import LoadingState from './azuos-loading-state.svelte';

describe('AzuosLoadingState', () => {
  // feliz
  it('says what is loading, politely, to screen readers', () => {
    render(LoadingState, { props: { data: { label: 'Carregando os chamados…' } } });

    expect(screen.getByRole('status')).toHaveTextContent('Carregando os chamados…');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  // triste
  it('keeps the spinner out of the accessible name', () => {
    const { container } = render(LoadingState, { props: { data: { label: 'Carregando…' } } });

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
