import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AzuosSupportHeader from './azuos-support-header.svelte';

const base = {
  title: 'Central de Chamados TI',
  subtitle: 'Abra e acompanhe as suas solicitações.',
  profileHref: '/support/profile',
};

describe('AzuosSupportHeader', () => {
  // feliz
  it('mostra a pessoa logada com o caminho para o perfil', () => {
    render(AzuosSupportHeader, {
      data: { ...base, person: { name: 'Bia Costa', avatarUrl: null } },
    });

    const link = screen.getByRole('link', { name: /meu perfil — bia costa/i });
    expect(link.getAttribute('href')).toBe('/support/profile');
    expect(screen.getByText('BC')).toBeTruthy();
  });

  // triste
  it('não mostra o cartão quando ainda não se sabe quem é', () => {
    render(AzuosSupportHeader, { data: { ...base, person: null } });

    expect(screen.queryByRole('link', { name: /meu perfil/i })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Central de Chamados TI' })).toBeTruthy();
  });

  // triste
  it('esconde o cartão quando já se está no perfil', () => {
    render(AzuosSupportHeader, {
      data: { ...base, person: { name: 'Bia Costa', avatarUrl: null }, profileHref: null },
    });

    expect(screen.queryByRole('link', { name: /meu perfil/i })).toBeNull();
  });
});
