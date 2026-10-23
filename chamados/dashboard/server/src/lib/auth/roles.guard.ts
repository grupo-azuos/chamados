import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { canWriteModule, hasModule } from '@template/shared/domain/module-access.util';
import { roleContextLabel, type RoleContext } from '@template/shared/domain/role-context.util';
import { USER_ROLE_LABELS, type UserRole } from '@template/shared/schemas/user.schema';

import { ANY_MODULE, MODULE_CONTEXT, READ_ONLY_ACTION } from './module-context.decorator';
import { IS_PUBLIC } from './public.decorator';
import { type AuthenticatedRequest, type RequestUser } from './request-user.type';
import { REQUIRED_ROLES } from './roles.decorator';

/** Leitura não muda nada; tudo o mais é escrita. */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * A TRANCA da API, em três perguntas:
 *
 *  1. **Tem alguém aí?** Sem identidade, 401.
 *  2. **A pessoa tem este módulo?** A rota declara o módulo (`@ModuleContext()`); sem ele, 403.
 *     Escrita (tudo que não é GET) exige Administrador do módulo — Gestor e Usuário só leem.
 *  3. **O papel serve?** Só quando a rota pede papel com `@Roles()`.
 *
 * Passada a tranca do módulo, o papel da requisição vira o papel DAQUELE módulo: o service
 * continua perguntando `user.role` e recebe a resposta certa para o módulo em que está, sem
 * saber que existem outros.
 *
 * Rota nasce fechada: sem `@ModuleContext()`, sem `@AnyModule()` e sem `@Roles()`, 403. Abrir
 * exige escrever uma linha que aparece na revisão. O super-admin passa por tudo.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.readMetadata<boolean>(IS_PUBLIC, context)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { method?: string }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Entre pelo endereço do sistema para continuar.');

    const moduleContext = this.readMetadata<RoleContext>(MODULE_CONTEXT, context);
    if (moduleContext) {
      const isReadOnlyAction = Boolean(this.readMetadata<boolean>(READ_ONLY_ACTION, context));
      const method = isReadOnlyAction ? 'GET' : (request.method ?? 'GET');
      request.user = scopeToModule(user, moduleContext, method);
    }

    return this.checkRoles(request.user ?? user, context, Boolean(moduleContext));
  }

  private checkRoles(
    user: RequestUser,
    context: ExecutionContext,
    hasModuleRule: boolean,
  ): boolean {
    const required = this.readMetadata<UserRole[]>(REQUIRED_ROLES, context);
    if (!required?.length) return this.requireDeclaredScope(context, hasModuleRule);
    if (user.role === 'superadmin') return true;
    if (required.includes(user.role)) return true;

    /* A mensagem diz qual perfil resolve. "Sem permissão" sozinho gera chamado. */
    const labels = required.map((role) => USER_ROLE_LABELS[role]).join(' ou ');

    throw new ForbiddenException(`Esta ação é de ${labels}.`);
  }

  private requireDeclaredScope(context: ExecutionContext, hasModuleRule: boolean): boolean {
    if (hasModuleRule || this.readMetadata<boolean>(ANY_MODULE, context)) return true;

    throw new ForbiddenException('Esta rota não declara a que módulo pertence.');
  }

  private readMetadata<T>(key: string, context: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T | undefined>(key, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}

/**
 * Confere o módulo e devolve a pessoa com o papel DAQUELE módulo. O super-admin sai intacto.
 */
function scopeToModule(user: RequestUser, context: RoleContext, method: string): RequestUser {
  if (user.role === 'superadmin') return user;

  const label = roleContextLabel(context);
  if (!hasModule(user, context)) {
    throw new ForbiddenException(
      `Você não tem acesso ao módulo ${label}. Peça a liberação ao super-admin.`,
    );
  }

  const isWrite = !READ_METHODS.has(method.toUpperCase());
  if (isWrite && !canWriteModule(user, context)) {
    throw new ForbiddenException(`Seu acesso a ${label} é só de consulta.`);
  }

  return { ...user, role: user.roles?.[context] ?? 'user' };
}
