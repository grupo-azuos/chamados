import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { mergeMap, type Observable } from 'rxjs';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { historyEntryOf, isMutation, type MutationRequest } from '../service/history-entry.util';
import { HistoryService } from '../service/history.service';
import { SKIP_HISTORY } from './skip-history.decorator';

type UploadedFiles = Record<string, { originalname?: string }[]> | { originalname?: string }[];

/**
 * TODA requisição que muda dado deixa uma linha no histórico — sem cada service lembrar.
 *
 * Global de propósito, pelo mesmo motivo do guard: rota nova já nasce registrada, e o
 * esquecimento não existe. Só grava o que DEU CERTO: requisição recusada não mudou nada.
 */
@Injectable()
export class HistoryInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly history: HistoryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (!isMutation(request.method) || this.isSkipped(context)) return next.handle();

    const mutation = mutationOf(request, context.getHandler().name);

    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        await this.history.record(historyEntryOf(mutation, result));

        return result;
      }),
    );
  }

  private isSkipped(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(SKIP_HISTORY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

function mutationOf(request: Request & { user?: RequestUser }, handler: string): MutationRequest {
  const route = request.route as { path?: unknown } | undefined;

  return {
    method: request.method,
    routePath: typeof route?.path === 'string' ? route.path : request.path,
    handler,
    params: paramsOf(request.params),
    body: request.body,
    fileNames: fileNamesOf((request as Request & { files?: UploadedFiles }).files),
    actor: request.user ? { id: request.user.id, email: request.user.email } : null,
    ip: request.ip ?? null,
    userAgent: request.get('user-agent') ?? null,
  };
}

/* Parâmetro de rota repetido vira lista no Express 5; para o histórico vale o primeiro. */
function paramsOf(params: Record<string, string | string[]>): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

/* Arquivo entra pelo nome: o conteúdo já está no storage, e não cabe no histórico. */
function fileNamesOf(files: UploadedFiles | undefined): string[] {
  if (!files) return [];
  const list = Array.isArray(files) ? files : Object.values(files).flat();

  return list.map((file) => file.originalname ?? '').filter((name) => name !== '');
}
