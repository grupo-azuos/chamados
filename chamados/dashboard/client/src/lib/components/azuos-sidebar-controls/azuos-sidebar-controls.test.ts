import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { expect, it } from 'vitest';

import AppShell from '$lib/components/azuos-app-shell/azuos-app-shell.svelte';

// O controle depende do contexto real da sidebar; a casca também expõe o resultado do gesto.
function renderShell(props: { initialSidebarOpen: boolean }) {
  return render(AppShell, {
    props: {
      ...props,
      children: createRawSnippet(() => ({ render: () => '<p>Conteúdo da tela</p>' })),
    },
  });
}

// feliz: o controle da borda aceita o mesmo clique único do botão do cabeçalho.
it('collapses and expands the sidebar with a single rail click', async () => {
  renderShell({ initialSidebarOpen: true });
  await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');
  await userEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
});

// feliz: arrastar precisa definir o estado, sem o clique seguinte inverter o resultado.
it('collapses by dragging the rail and ignores the following click', async () => {
  renderShell({ initialSidebarOpen: true });
  const rail = screen.getByRole('button', { name: 'Recolher menu' });
  await fireEvent(rail, new MouseEvent('pointerdown', { bubbles: true, clientX: 200 }));
  await fireEvent(rail, new MouseEvent('pointermove', { bubbles: true, clientX: 100 }));
  await fireEvent(rail, new MouseEvent('pointerup', { bubbles: true, clientX: 100 }));
  await fireEvent.click(rail);
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');
});

// triste: rolar na vertical não deve recolher o menu.
it('ignores vertical movement on the rail', async () => {
  renderShell({ initialSidebarOpen: true });
  const rail = screen.getByRole('button', { name: 'Recolher menu' });
  await fireEvent(rail, new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 0 }));
  await fireEvent(rail, new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 120 }));
  await fireEvent(rail, new MouseEvent('pointercancel', { bubbles: true }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
});

// feliz: arrastar a borda para o lado recolhe ou expande, e o clique que fecha o arrasto não desfaz o gesto.
it('collapses with a drag to the left and expands with a drag to the right', async () => {
  renderShell({ initialSidebarOpen: true });
  const rail = screen.getByRole('button', { name: 'Recolher menu' });
  rail.setPointerCapture = () => {};

  await fireEvent.pointerDown(rail, { button: 0, clientX: 200, clientY: 10, pointerId: 1 });
  /* Um movimento mais vertical que horizontal, ou curto demais, ainda não é arrasto. */
  await fireEvent.pointerMove(window, { clientX: 190, clientY: 80, pointerId: 1 });
  await fireEvent.pointerMove(window, { clientX: 180, clientY: 10, pointerId: 1 });
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
  await fireEvent.pointerMove(window, { clientX: 100, clientY: 12, pointerId: 1 });
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');
  await fireEvent.pointerUp(window, { pointerId: 1 });
  await fireEvent.click(rail);
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');

  await fireEvent.pointerDown(rail, { button: 0, clientX: 100, clientY: 10, pointerId: 1 });
  await fireEvent.pointerMove(window, { clientX: 200, clientY: 10, pointerId: 1 });
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
  await fireEvent.pointerCancel(window, { pointerId: 1 });
});

// triste: um clique com outro botão do mouse, ou fora da borda, não começa gesto nenhum.
it('ignores the right button and pointers that did not start on the rail', async () => {
  renderShell({ initialSidebarOpen: true });
  const rail = screen.getByRole('button', { name: 'Recolher menu' });

  await fireEvent.pointerDown(rail, { button: 2, clientX: 200, clientY: 10, pointerId: 2 });
  await fireEvent.pointerMove(window, { clientX: 20, clientY: 10, pointerId: 2 });
  await fireEvent.pointerDown(document.body, { button: 0, clientX: 200, clientY: 10, pointerId: 3 });
  await fireEvent.pointerMove(window, { clientX: 20, clientY: 10, pointerId: 3 });
  await fireEvent.click(document.body);

  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
});
