import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AzuosNavigationMenu from './azuos-navigation-menu.svelte';

const items = [
  { label: 'Visão geral', href: '/computers/12', isActive: true },
  { label: 'Histórico', href: '/computers/12/history' },
];
const ui = { ariaLabel: 'Seções do computador' };

describe('AzuosNavigationMenu', () => {
  // feliz
  it('draws one real link per section', () => {
    render(AzuosNavigationMenu, { props: { data: { items }, ui } });

    expect(screen.getByRole('navigation', { name: 'Seções do computador' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Histórico' })).toHaveAttribute(
      'href',
      '/computers/12/history',
    );
  });

  it('marks only the section the person is in', () => {
    render(AzuosNavigationMenu, { props: { data: { items }, ui } });

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Histórico' })).not.toHaveAttribute('aria-current');
  });

  // triste
  it('draws nothing when there are no sections', () => {
    render(AzuosNavigationMenu, { props: { data: { items: [] }, ui } });

    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
