import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@template/shared/schemas/user.schema';
import { GithubLinkedGuard } from './github-linked.guard';
import type { GithubOauthService } from './service/github-oauth.service';
import { READ_ONLY_ACTION } from '../../lib/auth/module-context.decorator';

/* O guard lê, pelo `Reflector`, se a ROTA é uma ação só de leitura (o sync): o contexto falso
   precisa ter o método e a classe da rota, como o do Nest tem. Sem eles o guard quebrava antes de
   decidir qualquer coisa, e o teste conferia um TypeError em vez da regra. */
function handler(isReadOnly = false) {
  const route = () => undefined;
  if (isReadOnly) Reflect.defineMetadata(READ_ONLY_ACTION, true, route);

  return route;
}

function setup(
  role: 'user' | 'manager' | 'admin',
  method = 'GET',
  linked = false,
  globalRole: SessionUser['role'] = 'user',
  isReadOnly = false,
) {
  const status = vi.fn().mockResolvedValue({ isLinked: linked });
  const guard = new GithubLinkedGuard({ status } as unknown as GithubOauthService);
  const user = { id: 'local-user', role: globalRole, roles: { sistema: role } };
  const route = handler(isReadOnly);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user, method }) }),
    getHandler: () => route,
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
  return { guard, context, status };
}

describe('System GitHub access', () => {
  it('allows managers to read shared data without OAuth', async () => {
    const { guard, context, status } = setup('manager');
    expect(await guard.canActivate(context)).toBe(true);
    expect(status).not.toHaveBeenCalled();
  });
  it('prevents managers from editing even with an external admin role', async () => {
    const { guard, context, status } = setup('manager', 'POST', true, 'admin');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(status).not.toHaveBeenCalled();
  });
  it('requires a verified link for System administrators', async () => {
    const { guard, context } = setup('admin');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows linked System administrators to edit', async () => {
    const { guard, context } = setup('admin', 'PATCH', true);
    expect(await guard.canActivate(context)).toBe(true);
  });
  /* A ação só de leitura (o sync) não é edição de sistema: passa sem o vínculo, e quem decide é
     o service. */
  it('lets a read-only action through without asking for the GitHub link', async () => {
    const { guard, context, status } = setup('manager', 'POST', false, 'user', true);
    expect(await guard.canActivate(context)).toBe(true);
    expect(status).not.toHaveBeenCalled();
  });
  it('requires OAuth for super administrators too', async () => {
    const { guard, context } = setup('user', 'GET', false, 'superadmin');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
