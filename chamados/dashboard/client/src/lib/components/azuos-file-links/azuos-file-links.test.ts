import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import FileLinks from './azuos-file-links.svelte';

const data = {
  fileName: 'orcamento-fonte.pdf',
  viewUrl: 'https://arquivos.exemplo.test/ver/1',
  downloadUrl: 'https://arquivos.exemplo.test/baixar/1',
};

describe('AzuosFileLinks', () => {
  // feliz
  it('opens in a new tab and downloads with the original name', () => {
    render(FileLinks, { props: { data } });

    const open = screen.getByRole('link', { name: 'Abrir orcamento-fonte.pdf' });
    expect(open).toHaveAttribute('href', data.viewUrl);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');

    const download = screen.getByRole('link', { name: 'Baixar orcamento-fonte.pdf' });
    expect(download).toHaveAttribute('href', data.downloadUrl);
    expect(download).toHaveAttribute('download', 'orcamento-fonte.pdf');
  });

  it('uses the given text for the open link', () => {
    render(FileLinks, { props: { data: { ...data, openLabel: 'orcamento-fonte.pdf' } } });

    expect(screen.getByText('orcamento-fonte.pdf')).toBeInTheDocument();
  });

  // triste
  it('falls back to "Abrir" when there is no text, and never sends the referrer', () => {
    render(FileLinks, { props: { data } });

    expect(screen.getByText('Abrir')).toBeInTheDocument();
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});

describe('AzuosFileLinks as a card', () => {
  // feliz
  it('shows the kind of the file, its name and the two pills, and removes it', async () => {
    const onRemove = vi.fn();
    render(FileLinks, {
      props: {
        data: { fileName: 'orcamento.pdf', viewUrl: '/v', downloadUrl: '/d', sizeLabel: '1,2 MB' },
        ui: { layout: 'card' },
        actions: { onRemove },
      },
    });

    expect(screen.getByText('PDF · 1,2 MB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir orcamento.pdf' })).toHaveAttribute(
      'target',
      '_blank',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Excluir orcamento.pdf' }));
    expect(onRemove).toHaveBeenCalled();
  });

  // triste
  it('has no trash can when nobody can remove the file', () => {
    render(FileLinks, {
      props: {
        data: { fileName: 'x.bin', viewUrl: '/v', downloadUrl: '/d' },
        ui: { layout: 'card' },
      },
    });

    expect(screen.getByText('Arquivo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
  });
});
