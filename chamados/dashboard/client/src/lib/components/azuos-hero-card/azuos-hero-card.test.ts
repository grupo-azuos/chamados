import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import { describe, expect, it, vi } from 'vitest';

import HeroCard from './azuos-hero-card.svelte';

const data = {
  title: 'Abrir chamado',
  description: 'Peça ajuda à TI',
  badge: 'Em 2 minutos',
  icon: LifeBuoy,
};

describe('AzuosHeroCard', () => {
  // feliz
  it('is a link when it has a destination', () => {
    render(HeroCard, { props: { data: { ...data, to: '/support' } } });

    expect(screen.getByRole('link', { name: /Abrir chamado/ })).toHaveAttribute('href', '/support');
    expect(screen.getByText('Em 2 minutos')).toBeInTheDocument();
  });

  it('is a button when it has a click action', async () => {
    const onClick = vi.fn();
    render(HeroCard, { props: { data, actions: { onClick } } });

    await userEvent.click(screen.getByRole('button', { name: /Abrir chamado/ }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('sits on the brand surface with the tone only as accent, never a coloured border', () => {
    render(HeroCard, { props: { data, ui: { tone: 'danger' } } });

    const card = screen.getByRole('article');
    expect(card).toHaveClass('bg-card');
    expect(card.querySelector('.text-hue-red')).not.toBeNull();
    expect(card.className).not.toMatch(/border-(destructive|primary|success|warning)/);
  });

  // triste
  it('is neither link nor button without an action, and has no empty badge', () => {
    render(HeroCard, { props: { data: { title: 'Só leitura', icon: LifeBuoy } } });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('article').querySelector('.rounded-chip')).toBeNull();
  });
});
