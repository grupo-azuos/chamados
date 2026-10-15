import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AdminConsoleProfileProvider } from './admin-console-profile.provider';
import { AdminConsoleUserDirectoryProvider } from './admin-console-user-directory.provider';
import { AuthenticationMiddleware } from './authentication.middleware';
import { IdentityProvider } from './identity.provider';
import { RolesGuard } from './roles.guard';
import { USER_DIRECTORY_PROVIDER } from './user-directory.token';

/**
 * Duas perguntas, dois mecanismos, nesta ordem:
 *
 *  1. **Middleware — quem é você.** Roda em toda rota, lê os cabeçalhos que o admin-console
 *     injeta pelo proxy e carimba a identidade na requisição.
 *  2. **Guard — o que você pode.** Recusa quem não se identificou, confere o módulo da rota
 *     (`@ModuleContext()`) e o papel (`@Roles()`).
 *
 * O guard é global para que rota nova nasça protegida: rota sem módulo declarado é recusada,
 * e abrir exceção é acrescentar uma linha que aparece na revisão de PR. O inverso — guard por
 * controller — faz rota nova nascer aberta, e ninguém revisa a ausência de algo.
 */
@Module({
  providers: [
    IdentityProvider,
    AdminConsoleProfileProvider,
    { provide: USER_DIRECTORY_PROVIDER, useClass: AdminConsoleUserDirectoryProvider },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [IdentityProvider, AdminConsoleProfileProvider, USER_DIRECTORY_PROVIDER],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    /* `{*path}` e não `'*'`: o Express 5 do Nest 11 não aceita mais o curinga solto, e o
       conversor de rota legada avisa no log a cada partida. */
    consumer
      .apply(AuthenticationMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
