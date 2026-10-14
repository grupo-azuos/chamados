import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import BrandMark from './azuos-brand-mark.svelte';

describe('AzuosBrandMark', () => {
  // feliz
  /* A marca é uma IMAGEM, e imagem precisa de texto alternativo: sem ele, quem usa leitor de
     tela ouve o nome do arquivo no lugar do nome da empresa. */
  it('names the brand for a screen reader', () => {
    render(BrandMark);

    expect(screen.getByRole('img', { name: 'Grupo Azuos' })).toBeInTheDocument();
  });

  it('uses the official white logo by default, not a hand-drawn copy', () => {
    render(BrandMark);

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      expect.stringContaining('azuos-logo-oficial-white'),
    );
  });

  it('uses the official symbol when the sidebar is collapsed', () => {
    render(BrandMark, { props: { ui: { variant: 'icon', size: 'sm' } } });

    /* O Vite embute o SVG pequeno como `data:` — o arquivo é o oficial, só o endereço muda. */
    expect(screen.getByRole('img').getAttribute('src')).toMatch(/azuos-icon|^data:image\/svg/);
    expect(screen.getByRole('img')).toHaveAttribute('width', '28');
  });

  it('uses the app icon on light screens, where the white logo would vanish', () => {
    render(BrandMark, { props: { ui: { variant: 'tile', size: 'lg' } } });

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      expect.stringContaining('azuos-app-icon'),
    );
    expect(screen.getByRole('img')).toHaveAttribute('width', '80');
  });

  it('changes width by size, keeping the height proportional', () => {
    render(BrandMark, { props: { ui: { size: 'lg' } } });

    expect(screen.getByRole('img')).toHaveAttribute('width', '180');
    expect(screen.getByRole('img').className).toContain('h-auto');
  });

  // triste
  /* Sem tamanho escolhido ela não nasce sem largura: o cabeçalho da barra pularia quando o
     arquivo terminasse de carregar. */
  it('has a default width when no size was given (edge case)', () => {
    render(BrandMark, { props: {} });

    expect(screen.getByRole('img')).toHaveAttribute('width', '110');
  });

  it('accepts an extra class without losing the proportional height', () => {
    render(BrandMark, { props: { ui: { className: 'opacity-80' } } });

    expect(screen.getByRole('img').className).toContain('opacity-80');
    expect(screen.getByRole('img').className).toContain('h-auto');
  });
});
