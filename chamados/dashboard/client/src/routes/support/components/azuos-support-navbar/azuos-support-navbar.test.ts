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
  it('leva às duas telas da Central e marca a atual', () => {
    renderNavbar('/support/tickets');

    expect(screen.getByRole('link', { name: /abrir chamado/i }).getAttribute('href')).toBe('/support');
    const consult = screen.getByRole('link', { name: /consultar chamado/i });
    expect(consult.getAttribute('href')).toBe('/support/tickets');
    expect(consult.getAttribute('aria-current')).toBe('page');
  });

  // feliz
  it('mostra a pessoa logada com o caminho para o perfil', () => {
    renderNavbar();

    const link = screen.getByRole('link', { name: /meu perfil — bia costa/i });
    expect(link.getAttribute('href')).toBe('/support/profile');
  });

  // feliz
  it('troca o tema e sai da conta pelos botões', async () => {
    const actions = renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(actions.onToggleTheme).toHaveBeenCalledOnce();
    expect(actions.onSignOut).toHaveBeenCalledOnce();
  });

  // triste
  it('não mostra o cartão da pessoa quando ainda não se sabe quem é', () => {
    renderNavbar('/support', { person: null });

    expect(screen.queryByRole('link', { name: /meu perfil/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
  });
});
