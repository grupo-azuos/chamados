import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import ThemeToggle from './azuos-theme-toggle.svelte';

describe('AzuosThemeToggle', () => {
  // feliz
  it('switches the theme and names the next one', async () => {
    render(ThemeToggle);

    const first = screen.getByRole('button');
    const before = first.getAttribute('aria-label');
    await userEvent.click(first);

    const after = screen.getByRole('button').getAttribute('aria-label');
    expect(after).not.toBe(before);
    expect([before, after].sort()).toEqual(['Mudar para o tema claro', 'Mudar para o tema escuro']);
  });

  // triste
  it('is an icon-only button that still has a name for screen readers', () => {
    render(ThemeToggle);

    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/^Mudar para o tema/);
  });
});
