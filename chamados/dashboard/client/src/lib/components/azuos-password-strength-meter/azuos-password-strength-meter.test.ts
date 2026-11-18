import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { STRENGTH_LABELS, toPasswordStrength } from '$lib/utils/password-strength.util';

import Meter from './azuos-password-strength-meter.svelte';

describe('AzuosPasswordStrengthMeter', () => {
  // feliz
  it('says the level in words and marks every rule met for a strong password', () => {
    const strength = toPasswordStrength('Cavalo-Bateria-42');
    render(Meter, { props: { data: { strength } } });

    expect(screen.getByText(STRENGTH_LABELS[strength.level])).toBeInTheDocument();
    expect(screen.queryAllByText('Falta:')).toHaveLength(0);
  });

  // triste
  it('lists what is missing for a weak password, in text and not only in colour', () => {
    const strength = toPasswordStrength('abc');
    const { container } = render(Meter, { props: { data: { strength } } });

    expect(screen.getAllByText('Falta:').length).toBeGreaterThan(0);
    const filled = [...container.querySelectorAll('[data-block]')].filter(
      (el) => !el.className.includes('bg-ink-300'),
    );
    expect(filled).toHaveLength(strength.score);
  });
});
