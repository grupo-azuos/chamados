import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type StorageService } from '../../../lib/storage/storage.service';
import { type AgentReleaseRepository } from '../repository/agent-release.repository';
import { AgentDownloadService } from './agent-download.service';

function setup() {
  const artifact = (name: string) => ({
    key: `agent/releases/1.2.3/${name}`,
    sha256: 'a'.repeat(64),
    sizeBytes: 123,
  });
  const latest = vi.fn().mockResolvedValue({
    version: '1.2.3',
    publishedAt: '2026-10-16T12:00:00.000Z',
    artifacts: { msi: artifact('agent.msi'), certificate: artifact('publisher.cer') },
  });
  const createDownloadUrl = vi.fn().mockResolvedValue('https://storage.example.test/signed');
  const service = new AgentDownloadService(
    { latest } as unknown as AgentReleaseRepository,
    { createDownloadUrl } as unknown as StorageService,
  );
  return { service, latest, createDownloadUrl };
}
const person = (roles: RequestUser['roles']): RequestUser => ({
  id: 'fixture',
  email: 'fixture@example.test',
  name: 'Pessoa',
  role: 'user',
  roles,
});

describe('dashboard agent download', () => {
  // feliz
  it.each(['infra', 'sistema'] as const)(
    'allows read-only %s access and exposes only LTS metadata',
    async (context) => {
      const { service } = setup();
      expect(await service.lts(person({ [context]: 'user' }))).toEqual({
        version: '1.2.3',
        publishedAt: '2026-10-16T12:00:00.000Z',
        sizeBytes: 123,
      });
    },
  );
  it.each([
    ['msi', 'agent.msi', 'azuos-agent-1.2.3-x64.msi'],
    ['certificate', 'publisher.cer', 'publisher.cer'],
    ['certificateScript', 'install-certificate.ps1', 'install-certificate.ps1'],
  ] as const)('signs only the selected %s on demand', async (kind, key, fileName) => {
    const { service, createDownloadUrl } = setup();
    expect(await service.download(person({ infra: 'user' }), kind, '1.2.3')).toEqual({
      version: '1.2.3',
      url: 'https://storage.example.test/signed',
    });
    expect(createDownloadUrl).toHaveBeenCalledExactlyOnceWith(`agent/releases/1.2.3/${key}`, {
      as: 'attachment',
      fileName,
    });
  });
  it('returns no LTS before promotion', async () => {
    const { service, latest } = setup();
    latest.mockResolvedValue(null);
    expect(await service.lts(person({ infra: 'user' }))).toBeNull();
  });
  // triste
  it.each([{}, { manutencao: 'admin' } as const])(
    'rejects unrelated modules before accessing storage',
    async (roles) => {
      const { service, latest, createDownloadUrl } = setup();
      await expect(service.lts(person(roles))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.download(person(roles), 'msi', '1.2.3')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(latest).not.toHaveBeenCalled();
      expect(createDownloadUrl).not.toHaveBeenCalled();
    },
  );
  it('refuses mixing downloads after an LTS change', async () => {
    const { service, createDownloadUrl } = setup();
    await expect(
      service.download(person({ infra: 'user' }), 'msi', '1.2.2'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });
  it('refuses arbitrary object keys from malformed metadata', async () => {
    const { service, latest, createDownloadUrl } = setup();
    latest.mockResolvedValue({ version: '1.2.3', artifacts: { msi: { key: 'tickets/private' } } });
    await expect(
      service.download(person({ sistema: 'user' }), 'msi', '1.2.3'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });
  it('reports storage failure instead of claiming no LTS exists', async () => {
    const { service, latest } = setup();
    latest.mockRejectedValue(new Error('private details'));
    await expect(service.lts(person({ infra: 'user' }))).rejects.toThrow(
      'Não consegui consultar o agente',
    );
  });
});
