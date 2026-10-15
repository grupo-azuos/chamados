import { Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { isUserMockEnabled, type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';
import {
  hasForwardedHeaders,
  IdentityProvider,
  MOCK_IDENTITY,
  readForwardedIdentity,
  type ForwardedIdentity,
} from './identity.provider';
import { type RequestUser } from './request-user.type';

/** Proxy mal configurado afeta TODA requisição; o aviso sai no máximo uma vez por minuto. */
const WARNING_WINDOW_MS = 60_000;

/**
 * Autenticação: quem é você. Roda antes de tudo, em toda requisição da API.
 *
 * É middleware, e não guard, de propósito. Guard é sobre PERMISSÃO — ele já recebe a
 * requisição sabendo quem está pedindo. Aqui ainda não se sabe, e resolver identidade dentro
 * de um guard misturaria as duas perguntas num lugar só.
 *
 * Este middleware NÃO recusa ninguém: ele só carimba na requisição quem foi identificado.
 * Recusar é do `RolesGuard`, que é global e sabe quais rotas são públicas (`@Public()`) —
 * abrir chamado e validar documento continuam funcionando para quem não tem identidade.
 *
 * DE ONDE A IDENTIDADE PODE VIR:
 *
 *  - **cabeçalhos válidos** do admin-console → a pessoa encaminhada;
 *  - **cabeçalhos pela metade** → NINGUÉM, e um aviso no log. Completar com o mock daria
 *    acesso a quem o provedor não soube identificar — o furo mais caro deste arquivo;
 *  - **sem cabeçalho nenhum** → a pessoa de desenvolvimento, só com `USER_MOCK` ligado. Em
 *    produção o mock é recusado na partida: lá, sem cabeçalho é alguém que chegou à API sem
 *    passar pelo proxy.
 */
@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthenticationMiddleware.name);
  private readonly isMockEnabled: boolean;
  private lastWarningAt = 0;

  constructor(
    private readonly identity: IdentityProvider,
    @Inject(ENV) env: Env,
  ) {
    this.isMockEnabled = isUserMockEnabled(env);
  }

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const forwarded = this.forwardedIdentityOf(request);
    if (!forwarded) return next();

    const user = await this.identity.resolve(forwarded);
    if (user) attach(request, user);

    return next();
  }

  private forwardedIdentityOf(request: Request): ForwardedIdentity | null {
    const forwarded = readForwardedIdentity(request.headers);
    if (forwarded) return forwarded;

    if (hasForwardedHeaders(request.headers)) {
      this.warnOnce();

      return null;
    }

    return this.isMockEnabled ? MOCK_IDENTITY : null;
  }

  private warnOnce(): void {
    const now = Date.now();
    if (now - this.lastWarningAt < WARNING_WINDOW_MS) return;

    this.lastWarningAt = now;
    this.logger.warn('Forwarded identity headers are incomplete or invalid — request is anonymous');
  }
}

function attach(request: Request, user: RequestUser): void {
  (request as Request & { user?: RequestUser }).user = user;
}
