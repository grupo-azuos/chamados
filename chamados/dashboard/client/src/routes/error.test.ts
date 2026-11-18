import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { page } from '$app/state';
import ErrorPage from './+error.svelte';

const route = page as unknown as { status: number; error: { message: string } | null };

afterEach(() => {
  route.status = 200;
  route.error = null;
});

describe('a tela de erro', () => {
  // triste
  it('diz que a tela não existe quando o endereço não leva a nada', () => {
    route.status = 404;
    render(ErrorPage);

    expect(screen.getByText('Esta tela não existe')).toBeInTheDocument();
    expect(screen.getByText(/O endereço pode estar errado/)).toBeInTheDocument();
  });

  // triste
  it('mostra o que deu errado, ou um aviso genérico, nas outras falhas', () => {
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
