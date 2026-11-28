import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setPeopleDirectory } from '$lib/hooks/use-people-directory/people-directory.svelte';
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
    setPeopleDirectory([]);
  });

  // feliz
  /* Regra do grupo: o registro que só guardou o nome ("Wellington Queiroz") mostra a foto. */
  it('finds the photo in the people directory by the name when no photo is given', async () => {
    vi.stubGlobal('Image', InstantLoadImage);
    setPeopleDirectory([
      { id: 'wq', name: 'Wellington Queiroz', avatarUrl: 'https://example.com/wq.jpg' },
    ]);

    const { container } = render(PersonAvatar, { props: { name: 'wellington queiroz' } });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', 'https://example.com/wq.jpg');
  });

  // feliz
  /* O registro que guardou o login (o e-mail) no lugar do id também mostra a foto. */
  it('finds the photo by the e-mail', async () => {
    vi.stubGlobal('Image', InstantLoadImage);
    setPeopleDirectory([
      { id: 'wq', name: 'Wellington Queiroz', email: 'wq@azuos.com.br', avatarUrl: 'https://example.com/wq.jpg' },
    ]);

    const { container } = render(PersonAvatar, { props: { name: 'W. Q.', email: 'WQ@azuos.com.br' } });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', 'https://example.com/wq.jpg');
  });

  // feliz
  it('finds the photo by the person id', async () => {
    vi.stubGlobal('Image', InstantLoadImage);
    setPeopleDirectory([
      { id: 'wq', name: 'Wellington Queiroz', avatarUrl: 'https://example.com/wq.jpg' },
    ]);

    const { container } = render(PersonAvatar, { props: { name: 'W. Queiroz', personId: 'wq' } });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', 'https://example.com/wq.jpg');
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

  // triste
  /* O avatar do bits-ui escondia as iniciais assim que dava a foto por carregada, e o rosto ficava
     em branco no seletor. Agora as iniciais ficam embaixo, e a foto que falha sai. */
  it('keeps the initials under the photo and drops a photo that fails to load', async () => {
    const { container } = render(PersonAvatar, {
      props: { name: 'Guilherme Siqueira', avatarUrl: 'https://fotos.exemplo/quebrada.png' },
    });

    const image = container.querySelector('[data-slot="avatar-image"]') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('GS');

    image.dispatchEvent(new Event('error'));

    await vi.waitFor(() =>
      expect(container.querySelector('[data-slot="avatar-image"]')).toBeNull(),
    );
    expect(screen.getByText('GS')).toBeVisible();
  });
});
