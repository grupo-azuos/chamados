import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PersonAvatar from './azuos-person-avatar.svelte';

/**
 * O `Avatar` do Radix / Bits-UI decide se a imagem carregou lendo `image.complete` /
 * `image.naturalWidth` logo depois de atribuir `image.src` — num `new Image()` próprio, fora
 * da árvore do DOM. Sem este stub, o jsdom nunca marca a imagem como completa e a foto fica
 * presa nas iniciais para sempre, mesmo com `avatarUrl` preenchido.
 */
class InstantLoadImage {
  complete = false;
  naturalWidth = 0;

  addEventListener(type: string, listener: any) {
    if (type === 'load') listener();
  }
  removeEventListener() {}

  set src(_value: string) {
    this.complete = true;
    this.naturalWidth = 1;
  }
}

describe('AzuosPersonAvatar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // feliz
  it('shows the initials when there is no photo', () => {
    render(PersonAvatar, { props: { name: 'Rafael Camargo' } });

    expect(screen.getByText('RC')).toBeInTheDocument();
  });

  // feliz
  it('uses the photo when avatarUrl is filled', async () => {
    vi.stubGlobal('Image', InstantLoadImage);

    const { container } = render(PersonAvatar, {
      props: { name: 'Camila', avatarUrl: 'https://example.com/camila.jpg' },
    });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', 'https://example.com/camila.jpg');
  });

  /* Duas iniciais bastam; nome com vários sobrenomes não pode virar mais que isso. */
  it('cuts the initials to two letters even with a compound name', () => {
    render(PersonAvatar, {
      props: { name: 'Maria Fernanda Albuquerque Nascimento' },
    });

    expect(screen.getByText('MF')).toBeInTheDocument();
  });

  // triste
  it('a one-word name gives a single initial', () => {
    render(PersonAvatar, { props: { name: 'Bia' } });

    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
