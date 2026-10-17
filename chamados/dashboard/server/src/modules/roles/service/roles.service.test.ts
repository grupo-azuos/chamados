import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';
import { type RolesRepository } from '../repository/roles.repository';
import { RolesService } from './roles.service';

const SUPERADMIN: RequestUser = {
  id: 'super_1',
  email: 'super@empresa.com.br',
  name: 'Super Administrador',
  role: 'superadmin',
};

const ADMIN: RequestUser = {
  id: 'admin_1',
  email: 'admin@empresa.com.br',
  name: 'Administrador',
  role: 'admin',
};

const MANAGER: RequestUser = {
  id: 'manager_1',
  email: 'gestor@empresa.com.br',
  name: 'Gestor',
  role: 'manager',
};

const USER: RequestUser = {
  id: 'user_1',
  email: 'user@empresa.com.br',
  name: 'Usuario Comum',
  role: 'user',
};

const ROW: InternalRoleRow = {
  id: 1,
  userId: 'user_1',
  userEmail: 'user@empresa.com.br',
  context: 'manutencao',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  createdBy: 'super@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

describe('RolesService', () => {
  let repository: RolesRepository;
  let userDirectory: { listUsers: ReturnType<typeof vi.fn>; getUserById: ReturnType<typeof vi.fn> };
  let service: RolesService;

  beforeEach(() => {
    repository = {
      list: vi.fn().mockResolvedValue([ROW]),
      findById: vi.fn().mockResolvedValue(ROW),
      findByUserIdOrEmail: vi.fn().mockResolvedValue([ROW]),
      upsert: vi.fn().mockResolvedValue(ROW),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as RolesRepository;

    userDirectory = {
      listUsers: vi.fn().mockResolvedValue([
        {
          id: 'user_1',
          name: 'Usuario Comum',
          email: 'user@empresa.com.br',
          image: null,
          role: 'user',
          banned: false,
          createdAt: '2026-10-01T12:00:00.000Z',
        },
      ]),
      getUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        name: 'Usuario Comum',
        email: 'user@empresa.com.br',
      }),
    };

    service = new RolesService(repository, userDirectory as never, { NODE_ENV: 'test' } as Env);
  });

  describe('list', () => {
    // feliz
    it('allows superadmin to list all internal roles', async () => {
      const result = await service.list(SUPERADMIN);
      expect(result).toHaveLength(1);
    });

    it('lists who has which module', async () => {
      const result = await service.list(SUPERADMIN);
      expect(result[0]!.userId).toBe('user_1');
      expect(result[0]!.context).toBe('manutencao');
    });

    // triste
    /* Administrador de módulo não libera módulo para ninguém — nem para si mesmo. */
    it('refuses an Administrator: only the super-admin sees the accesses', async () => {
      await expect(service.list(ADMIN)).rejects.toThrow(ForbiddenException);
    });

    it('refuses manager with ForbiddenException', async () => {
      await expect(service.list(MANAGER)).rejects.toThrow(ForbiddenException);
    });

    it('refuses plain user with ForbiddenException', async () => {
      await expect(service.list(USER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assign', () => {
    // feliz
    it('lets the super-admin give a module to a person', async () => {
      const input = {
        userId: 'user_1',
        userEmail: 'user@empresa.com.br',
        context: 'manutencao' as const,
      };

      const result = await service.assign(SUPERADMIN, input);
      expect(repository.upsert).toHaveBeenCalledWith({
        userId: 'user_1',
        userEmail: 'user@empresa.com.br',
        context: 'manutencao',
        createdBy: SUPERADMIN.email,
        updatedBy: SUPERADMIN.email,
      });
      expect(result.context).toBe('manutencao');
    });

    // triste
    it('refuses an Administrator giving modules (only the super-admin does)', async () => {
      await expect(
        service.assign(ADMIN, {
          userId: 'user_1',
          context: 'sistema',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses manager from assigning roles', async () => {
      await expect(
        service.assign(MANAGER, {
          userId: 'user_1',
          context: 'sistema',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses plain user from assigning roles', async () => {
      await expect(
        service.assign(USER, {
          userId: 'user_1',
          context: 'sistema',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    // feliz
    it('allows superadmin to delete an internal role', async () => {
      await expect(service.delete(SUPERADMIN, 1)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    // triste
    it('refuses admin from deleting roles', async () => {
      await expect(service.delete(ADMIN, 1)).rejects.toThrow(ForbiddenException);
    });

    it('refuses non-admin from deleting roles', async () => {
      await expect(service.delete(MANAGER, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.delete(USER, 1)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when role does not exist', async () => {
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.delete(SUPERADMIN, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listUsers', () => {
    // feliz
    it('lets the super-admin list the people of the system', async () => {
      const users = await service.listUsers(SUPERADMIN);
      expect(users).toHaveLength(1);
      expect(users[0]!.name).toBe('Usuario Comum');
    });

    // triste
    it('refuses anyone else listing the people', async () => {
      await expect(service.listUsers(ADMIN)).rejects.toThrow(ForbiddenException);
      await expect(service.listUsers(MANAGER)).rejects.toThrow(ForbiddenException);
      await expect(service.listUsers(USER)).rejects.toThrow(ForbiddenException);
    });
  });
});
