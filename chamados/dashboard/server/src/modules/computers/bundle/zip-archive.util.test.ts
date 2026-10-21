import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { crc32, createZipArchive } from './zip-archive.util';

const folders: string[] = [];

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

/** Abre o zip com o `unzip` do sistema: prova que o formato é lido por outra ferramenta. */
function extract(archive: Buffer): string {
  const folder = mkdtempSync(join(tmpdir(), 'zip-archive-'));
  folders.push(folder);
  writeFileSync(join(folder, 'bundle.zip'), archive);
  execFileSync('unzip', ['-q', 'bundle.zip', '-d', 'out'], { cwd: folder });
  return join(folder, 'out');
}

describe('createZipArchive', () => {
  // feliz
  it('packs every file so that a standard unzip tool restores the exact bytes', () => {
    const binary = Buffer.from([0, 1, 2, 255, 254, 10, 13]);
    const archive = createZipArchive([
      { name: 'install-agent.ps1', content: Buffer.from("Write-Host 'olá'\n", 'utf8') },
      { name: 'azuos-agent-1.0.0-x64.msi', content: binary },
    ]);

    const out = extract(archive);

    expect(readFileSync(join(out, 'install-agent.ps1'), 'utf8')).toBe("Write-Host 'olá'\n");
    expect(readFileSync(join(out, 'azuos-agent-1.0.0-x64.msi')).equals(binary)).toBe(true);
  });

  // feliz
  it('computes the standard CRC-32 checksum', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  // triste
  it('refuses to build an empty archive', () => {
    expect(() => createZipArchive([])).toThrow(/at least one entry/);
  });
});
