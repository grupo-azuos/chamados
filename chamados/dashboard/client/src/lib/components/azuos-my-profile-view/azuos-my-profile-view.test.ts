import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, type Component } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import MyProfileView, { type AzuosMyProfileViewProps } from './azuos-my-profile-view.svelte';

const person = {
  name: 'Ana Souza',
  email: 'ana@grupoazuos.com.br',
  roleLabel: 'Super Admin',
  avatarUrl: null,
  jobTitle: 'Analista de TI',
  department: null,
  phone: '11912345678',
  birthDateLabel: '25/03/1990',
  bio: null,
  systems: [{ name: 'Paralegal', url: 'https://paralegal.test', roleLabel: 'Usuário' }],
};

function renderView(overrides: Partial<AzuosMyProfileViewProps> = {}) {
  const props: AzuosMyProfileViewProps = {
    data: { person, accountUrl: 'https://admin-console.test/profile', theme: 'light' },
    actions: { onToggleTheme: vi.fn(), onRetry: vi.fn() },
    ...overrides,
  };
  render(MyProfileView, { props });

  return props;
}

describe('AzuosMyProfileView (Svelte)', () => {
  // feliz
  it('shows the same read-only card as the other systems', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Identidade' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ana Souza' })).toHaveTextContent('AS');
    expect(screen.getByText('25/03/1990')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends the person to the admin console to edit', () => {
    renderView();

    expect(screen.getByRole('link', { name: 'Editar no Admin Console' })).toHaveAttribute(
      'href',
      'https://admin-console.test/profile',
    );
  });

  it('lists the systems the person opens', () => {
    renderView();

    expect(screen.getByRole('link', { name: 'Paralegal' })).toHaveAttribute('href', 'https://paralegal.test');
  });

  it('adds the sections only this system has, after the standard ones', () => {
    const content = createRawSnippet(() => ({ render: () => '<p>Módulos aqui</p>' }));
    renderView({
      slots: {
        extraSections: [{ id: 'profile-modules', label: 'Seus módulos', icon: LayoutGrid as Component, content }],
      },
    });

    expect(screen.getByText('Módulos aqui')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seus módulos' })).toHaveAttribute('href', '#profile-modules');
  });

  it('switches the theme', async () => {
    const props = renderView();

    await userEvent.click(screen.getByRole('switch', { name: 'Tema escuro' }));

    expect(props.actions.onToggleTheme).toHaveBeenCalledOnce();
  });

  // triste
  it('says when a field was never filled in', () => {
    renderView();

    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
  });

  it('says when the systems could not be read', () => {
    renderView({ data: { person: { ...person, systems: undefined }, accountUrl: null, theme: 'dark' } });

    expect(screen.getByText('Não consegui ver seus sistemas agora.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar no Admin Console' })).not.toBeInTheDocument();
  });

  it('offers a retry when the profile did not load', async () => {
    const props = renderView({
      data: { person: null, accountUrl: null, theme: 'light' },
      state: { error: 'Não consegui carregar seu perfil.' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui carregar seu perfil.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(props.actions.onRetry).toHaveBeenCalledOnce();
  });

  it('shows the skeleton while loading', () => {
    renderView({ state: { isLoading: true } });

    expect(screen.getByRole('status')).toHaveTextContent('Carregando seu perfil');
  });
});
