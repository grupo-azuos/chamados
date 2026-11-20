import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { page } from '$app/state';
import ErrorPage from './+error.svelte';

const route = page as unknown as { status: number; error: { message: string } | null };

afterEach(() => {
  route.status = 200;
  route.error = null;
});

describe('the error screen', () => {
  // triste
  it('says the screen does not exist when the address leads nowhere', () => {
    route.status = 404;
    render(ErrorPage);

    expect(screen.getByText('Esta tela não existe')).toBeInTheDocument();
    expect(screen.getByText(/O endereço pode estar errado/)).toBeInTheDocument();
  });

  // triste
  it('shows what went wrong, or a generic notice, on other failures', () => {
    route.status = 500;
    route.error = { message: 'O servidor tropeçou.' };
    const { unmount } = render(ErrorPage);
    expect(screen.getByText('Não foi possível carregar a tela')).toBeInTheDocument();
    expect(screen.getByText('O servidor tropeçou.')).toBeInTheDocument();
    unmount();

    route.error = null;
    render(ErrorPage);
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument();
  });
});
