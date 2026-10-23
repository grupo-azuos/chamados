import { Reflector } from '@nestjs/core';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { READ_ONLY_ACTION } from '../../lib/auth/module-context.decorator';
import { type AuthenticatedRequest } from '../../lib/auth/request-user.type';
import { GithubOauthService, GITHUB_LINK_REQUIRED } from './service/github-oauth.service';
import { canEditSystem, requiresSystemGithub } from '@template/shared/domain/system-access.util';

@Injectable()
export class GithubLinkedGuard implements CanActivate {
  constructor(
    private readonly oauth: GithubOauthService,
    private readonly reflector: Reflector = new Reflector(),
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, method } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { method: string }>();
    if (!user) throw new UnauthorizedException('Faça login para continuar.');
    /* Ação que só traz dado de fora (o sync): não é edição de sistema, e quem decide é o
       service — ter o GitHub vinculado, para qualquer papel. */
    if (this.isReadOnlyAction(context)) return true;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !canEditSystem(user)) {
      throw new ForbiddenException(
        'Somente administradores do módulo Sistema podem editar seus dados.',
      );
    }
    if (!requiresSystemGithub(user)) return true;
    const status = await this.oauth.status(user.id);
    if (!status.isLinked) throw new ForbiddenException(GITHUB_LINK_REQUIRED);
    return true;
  }

  private isReadOnlyAction(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(READ_ONLY_ACTION, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}
