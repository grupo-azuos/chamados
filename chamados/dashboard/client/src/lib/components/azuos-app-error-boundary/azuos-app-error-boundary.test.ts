import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import AppErrorBoundary from './azuos-app-error-boundary.svelte';

describe('AzuosAppErrorBoundary', () => {
  // feliz
  // feliz
  it('draws the content as usual when nothing breaks', () => {
    const children = createRawSnippet(() => ({
      render: () => '<div>Conteúdo normal</div>',
    }));

    render(AppErrorBoundary, { props: { children } });

    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
  });

  /* Sem a boundary, um erro de render esvazia a página e a tela fica em branco — sem
     mensagem, sem o que relatar. É o pior resultado possível, e é o que este teste prova
     que não acontece mais. */
  // triste
  it('catches the render error and shows the reason instead of blanking the screen', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const children = createRawSnippet(() => ({
      render: (): string => {
        throw new Error('Falha simulada no teste');
      },
    }));

    render(AppErrorBoundary, { props: { children } });

    expect(screen.getByRole('alert')).toHaveTextContent('A tela não carregou');
    expect(screen.getByText('Falha simulada no teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
