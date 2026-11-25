import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import HintHarness from './azuos-hint-harness.test.svelte';

describe('AzuosHint', () => {
  // feliz
  it('shows the whole text in the project balloon when the element is hovered', async () => {
    render(HintHarness, { props: { text: 'Contratos: seletor de parte, telas e máscaras' } });

    const target = screen.getByRole('link', { name: 'Contratos' });
    expect(target).not.toHaveAttribute('title');
    await userEvent.hover(target);
    expect(
      await screen.findAllByText('Contratos: seletor de parte, telas e máscaras'),
    ).not.toHaveLength(0);
  });

  // triste
  it('shows nothing before the hover', () => {
    render(HintHarness, { props: { text: 'Texto escondido' } });

    expect(screen.queryByText('Texto escondido')).not.toBeInTheDocument();
  });
});
