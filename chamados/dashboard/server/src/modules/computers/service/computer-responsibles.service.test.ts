import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { RequestUser } from '../../../lib/auth/request-user.type';
import type { UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { ComputerResponsiblesService } from './computer-responsibles.service';

const actor: RequestUser = { id: 'admin-1', name: 'Admin Exemplo', email: 'admin@exemplo.invalid', role: 'admin' };
function setup() {
  const listUsers = vi.fn().mockResolvedValue([
    { id: 'person-1', name: 'Ana Exemplo', email: 'ana@exemplo.invalid', role: 'user', image: '/avatar', banned: false },
    { id: 'person-2', name: 'Conta bloqueada', email: 'bloqueada@exemplo.invalid', banned: true },
  ]);
  const service = new ComputerResponsiblesService({ listUsers } as unknown as UserDirectoryProvider);
  return { service, listUsers };
}

describe('ComputerResponsiblesService', () => {
  // feliz
  it('lists system users for device registrars, returning only picker data', async () => {
    const { service } = setup();
    await expect(service.list(actor)).resolves.toEqual([
      { id: 'person-1', name: 'Ana Exemplo', email: 'ana@exemplo.invalid' },
    ]);
  });

  // triste
  it('rejects read-only users before fetching directory data', async () => {
    const { service, listUsers } = setup();
    await expect(service.list({ ...actor, role: 'user' })).rejects.toThrow(ForbiddenException);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('keeps upstream failure distinct from an empty directory', async () => {
    const { service, listUsers } = setup();
    listUsers.mockRejectedValue(new ServiceUnavailableException('Directory unavailable'));
    await expect(service.list(actor)).rejects.toThrow(ServiceUnavailableException);
  });
});
