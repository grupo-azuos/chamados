import { createHash } from 'node:crypto';

import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { type AgentReleaseRepository } from '../repository/agent-release.repository';
import { AgentBundleService } from './agent-bundle.service';
import { type ComputersService } from './computers.service';

const MSI = Buffer.from('fake-msi-bytes');

function setup(options: { msiHash?: string; missing?: string } = {}) {
  const artifact = (name: string, sha256: string) => ({
    key: `agent/releases/1.2.3/${name}`,
    sha256,
    sizeBytes: 123,
  });
  const manifestOf = vi.fn().mockResolvedValue({
    version: '1.2.3',
    publishedAt: '2026-10-16T12:00:00.000Z',
    artifacts: {
      msi: artifact('azuos-agent-1.2.3-x64.msi', options.msiHash ?? createHash('sha256').update(MSI).digest('hex')),
      certificate: artifact('publisher.cer', 'b'.repeat(64)),
    },
  });
  const get = vi.fn(async (key: string) => {
    if (key === options.missing) return null;
    const content = key.endsWith('.msi') ? MSI : Buffer.from(`conteúdo de ${key}`);
    return { content, contentType: null };
  });
  const authenticateAgent = vi.fn().mockResolvedValue({
    ok: true,
    computer: { id: 7, name: 'Recepção 01' },
  });
  const service = new AgentBundleService(
    { manifestOf } as unknown as AgentReleaseRepository,
    { get } as unknown as FileStorage,
    { authenticateAgent } as unknown as ComputersService,
  );
  return { service, get, authenticateAgent, manifestOf };
}

/* O papel geral acompanha o do módulo: quem administra algum módulo é administrador (é o
   admin-console que dá os dois), e quem só consulta é usuário. */
const person = (roles: RequestUser['roles']): RequestUser => ({
  id: 'fixture',
  email: 'fixture@example.test',
  name: 'Pessoa',
  role: Object.values(roles ?? {}).includes('admin') ? 'admin' : 'user',
  roles,
});

const request = { version: '1.2.3', serverUrl: 'https://chamados.example.test' };

/** Lê os nomes gravados no diretório central do zip, sem depender de ferramenta externa. */
function entryNames(zip: Buffer): string[] {
  const names: string[] = [];
  for (let offset = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])); offset >= 0; ) {
    const length = zip.readUInt16LE(offset + 28);
    names.push(zip.subarray(offset + 46, offset + 46 + length).toString('utf8'));
    offset = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset + 46 + length);
  }
  return names;
}

/** O conteúdo de uma entrada, lido do cabeçalho local (o zip é "store", sem compressão). */
function entryContent(zip: Buffer, name: string): Buffer {
  for (let offset = zip.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04])); offset >= 0; ) {
    const size = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const start = offset + 30 + nameLength + extraLength;
    if (zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8') === name)
      return zip.subarray(start, start + size);
    offset = zip.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), start + size);
  }
  throw new Error(`entry ${name} not found`);
}

describe('AgentBundleService', () => {
  // feliz
  it('packs the MSI, certificate, scripts and readme for a generic install', async () => {
    const { service, authenticateAgent } = setup();

    const bundle = await service.bundle(person({ sistema: 'user' }), request);

    expect(bundle.fileName).toBe('azuos-agent-1.2.3-x64.zip');
    expect(entryNames(bundle.content)).toEqual([
      'azuos-agent-1.2.3-x64.msi',
      'publisher.cer',
      'install-certificate.ps1',
      'instalar.cmd',
      'install-agent.ps1',
      'LEIA-ME.txt',
    ]);
    expect(bundle.content.includes("[string]$Token = '__TOKEN__'")).toBe(true);
    expect(authenticateAgent).not.toHaveBeenCalled();
  });

  // feliz
  it('embeds the token and names the zip after the machine when the token is its own', async () => {
    const { service } = setup();

    const bundle = await service.bundle(person({ infra: 'admin' }), {
      ...request,
      token: 'token-da-recepcao',
      computerId: 7,
    });

    expect(bundle.fileName).toBe('instalar-agente-recepcao-01.zip');
    expect(bundle.content.includes("[string]$Token = 'token-da-recepcao'")).toBe(true);
    expect(bundle.content.includes("[string]$ServerUrl = 'https://chamados.example.test'")).toBe(true);
  });

  // feliz
  /* O duplo clique precisa chamar o script da mesma pasta, com a política liberada só para ele,
     e o script precisa do BOM para o PowerShell 5.1 ler os acentos. */
  it('ships a double-click launcher that runs the script with the execution policy bypassed', async () => {
    const { service } = setup();

    const bundle = await service.bundle(person({ infra: 'admin' }), {
      ...request,
      token: 'token-da-recepcao',
      computerId: 7,
    });

    const launcher = entryContent(bundle.content, 'instalar.cmd').toString('utf8');
    expect(launcher).toContain('-ExecutionPolicy Bypass -File "%~dp0install-agent.ps1"');
    expect(launcher).toContain('Unblock-File');
    expect(launcher).toContain('\r\n');
    expect([...entryContent(bundle.content, 'install-agent.ps1').subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  // triste
  it('refuses a token from someone whose profile cannot register computers', async () => {
    const { service, authenticateAgent } = setup();

    await expect(
      service.bundle(
        /* Papel fora da lista: a policy de cadastrar computador recusa antes de olhar o token. */
        { ...person({ infra: 'admin' }), role: 'guest' as unknown as RequestUser['role'] },
        { ...request, token: 't', computerId: 7 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(authenticateAgent).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a token that matches no machine at all', async () => {
    const { service, authenticateAgent } = setup();
    authenticateAgent.mockResolvedValueOnce({ ok: false, reason: 'invalid-token' });

    await expect(
      service.bundle(person({ infra: 'admin' }), { ...request, token: 'inventado', computerId: 7 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // triste
  it('refuses a token that belongs to another machine', async () => {
    const { service } = setup();

    await expect(
      service.bundle(person({ infra: 'admin' }), { ...request, token: 'outro', computerId: 99 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // triste
  it('refuses people without Infrastructure or System access', async () => {
    const { service, manifestOf } = setup();

    await expect(service.bundle(person({ manutencao: 'admin' }), request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(manifestOf).not.toHaveBeenCalled();
  });

  // triste
  it('does not ship an MSI whose bytes differ from the published hash', async () => {
    const { service } = setup({ msiHash: 'c'.repeat(64) });

    await expect(service.bundle(person({ infra: 'user' }), request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  // triste
  it('reports a missing release file instead of shipping a partial package', async () => {
    const { service } = setup({ missing: 'agent/releases/1.2.3/install-certificate.ps1' });

    await expect(service.bundle(person({ infra: 'user' }), request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  // triste
  it('answers not found for a version that was never published', async () => {
    const { service, manifestOf } = setup();
    manifestOf.mockResolvedValueOnce(null);

    await expect(service.bundle(person({ infra: 'user' }), request)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
