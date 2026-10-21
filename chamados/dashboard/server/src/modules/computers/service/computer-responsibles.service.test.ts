import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { RequestUser } from '../../../lib/auth/request-user.type';
import type { UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { ComputerResponsiblesService } from './computer-responsibles.service';

const actor: RequestUser = { id: 'admin-1', name: 'Admin Exemplo', email: 'admin@exemplo.invalid', role: 'admin' };
function setup() {
  const listAllUsers = vi.fn().mockResolvedValue([
    { id: 'person-1', name: 'Ana Exemplo', email: 'ana@exemplo.invalid', role: 'user', image: '/avatar', banned: false },
    { id: 'person-2', name: 'Conta bloqueada', email: 'bloqueada@exemplo.invalid', banned: true },
  ]);
  const listUsers = vi.fn().mockResolvedValue([]);
  const service = new ComputerResponsiblesService({ listAllUsers, listUsers } as unknown as UserDirectoryProvider);
  return { service, listAllUsers, listUsers };
}

describe('ComputerResponsiblesService', () => {
  // feliz
  it('lists office users without system access, returning only identifiers and names', async () => {
    const { service, listAllUsers, listUsers } = setup();
    await expect(service.list(actor)).resolves.toEqual([
      { id: 'person-1', name: 'Ana Exemplo' },
    ]);
    expect(listAllUsers).toHaveBeenCalledOnce();
    expect(listUsers).not.toHaveBeenCalled();
  });

  // triste
  it('rejects unknown roles before fetching directory data', async () => {
    const { service, listAllUsers } = setup();
    await expect(service.list({ ...actor, role: 'unknown' as RequestUser['role'] })).rejects.toThrow(ForbiddenException);
    expect(listAllUsers).not.toHaveBeenCalled();
  });

  it('keeps upstream failure distinct from an empty directory', async () => {
    const { service, listAllUsers } = setup();
    listAllUsers.mockRejectedValue(new ServiceUnavailableException('Directory unavailable'));
    await expect(service.list(actor)).rejects.toThrow(ServiceUnavailableException);
  });
});
