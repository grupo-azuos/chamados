import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AzuosSupportNavbar from './azuos-support-navbar.svelte';

const person = { name: 'Bia Costa', avatarUrl: null };

function renderNavbar(activeHref = '/support', overrides: { person?: typeof person | null } = {}) {
  const actions = { onToggleTheme: vi.fn(), onSignOut: vi.fn() };
  render(AzuosSupportNavbar, {
    data: { activeHref, person: 'person' in overrides ? overrides.person! : person, theme: 'light' },
    actions,
  });

  return actions;
}

describe('AzuosSupportNavbar', () => {
  // feliz
  it('leads to both Central screens and marks the current one', () => {
    renderNavbar('/support/tickets');

    expect(screen.getByRole('link', { name: /abrir chamado/i }).getAttribute('href')).toBe('/support');
    const consult = screen.getByRole('link', { name: /consultar chamado/i });
    expect(consult.getAttribute('href')).toBe('/support/tickets');
    expect(consult.getAttribute('aria-current')).toBe('page');
  });

  // feliz
  it('shows the signed-in person with the way to the profile', () => {
    renderNavbar();

    const link = screen.getByRole('link', { name: /meu perfil — bia costa/i });
    expect(link.getAttribute('href')).toBe('/support/profile');
  });

  // feliz
  it('switches the theme and signs out through the buttons', async () => {
    const actions = renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(actions.onToggleTheme).toHaveBeenCalledOnce();
    expect(actions.onSignOut).toHaveBeenCalledOnce();
  });

  // triste
  it('hides the person card while it is not known who they are', () => {
    renderNavbar('/support', { person: null });

    expect(screen.queryByRole('link', { name: /meu perfil/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
  });
});
