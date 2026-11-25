import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Response } from 'express';
import { ZodError } from 'zod';

/**
 * Formato único de erro da API.
 *
 * A trava herdada por trás disto: falha de gravação precisa APARECER na tela, em
 * vermelho, com o motivo, até resolver. Para a tela conseguir mostrar o motivo, a resposta
 * precisa trazê-lo sempre no mesmo lugar — e por isso este filtro é global.
 *
 * `details` existe para o erro de validação: dizer "dados inválidos" obriga a pessoa a
 * adivinhar qual campo, e ela desiste antes de acertar.
 */
export type ApiErrorBody = {
  statusCode: number;
  message: string;
  details?: { field: string; message: string }[];
  path: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const path = http.getRequest<{ url?: string }>().url ?? '';

    const body = this.toBody(exception, path);

    /* 5xx é nosso: vai para o log com pilha. 4xx é do cliente e não polui o log — foi o
       log sem teto que esgota disco e esconde o erro que importa. */
    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${body.statusCode} ${path} — ${body.message}`, stackOf(exception));
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ApiErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Confira os campos destacados.',
        details: exception.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
        path,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      return { ...describeHttpException(exception), path, timestamp };
    }

    /* Mensagem genérica de propósito: texto de exceção não tratada pode conter valor de
       campo — dado de cliente, documento, e-mail. O detalhe fica no log. */
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Não consegui concluir. O erro foi registrado — tente de novo em instantes.',
      path,
      timestamp,
    };
  }
}

function describeHttpException(exception: HttpException): {
  statusCode: number;
  message: string;
  details?: { field: string; message: string }[];
} {
  const statusCode = exception.getStatus();
  const payload = exception.getResponse();

  if (typeof payload === 'string') return { statusCode, message: inPortuguese(statusCode, payload) };

  const record = payload as { message?: unknown; errors?: unknown };
  const details = readValidationDetails(record.errors);

  /* O `createZodDto` responde "Validation failed" — em inglês, e é texto que a tela mostra.
     Quando há detalhe por campo, a mensagem geral é nossa; o motivo de cada campo vem em
     `details`, com o texto em português do schema. */
  if (details?.length) {
    return { statusCode, message: 'Confira os campos destacados.', details };
  }

  const message = Array.isArray(record.message)
    ? record.message.join('; ')
    : String(record.message ?? exception.message);

  return { statusCode, message: inPortuguese(statusCode, message) };
}

/**
 * O que a pessoa lê é em português. As recusas do PRÓPRIO framework — do Nest ("Not Found",
 * "Cannot GET /x") e do leitor do corpo ("request entity too large") — chegam em inglês e iam
 * direto para a tela. Elas são reconhecidas pelo texto e trocadas pelo motivo do status; as
 * nossas, já em português, passam como vieram.
 */
const FRAMEWORK_MESSAGE =
  /^(?:request entity too large|request aborted|request size did not match content length|unsupported (?:charset|content encoding)\b.*|unexpected (?:token|end of json)\b.*|.*is not valid json.*|cannot (?:get|post|put|patch|delete|head|options) .*|bad request|unauthorized|forbidden|not found|method not allowed|not acceptable|request timeout|conflict|gone|payload too large|unsupported media type|unprocessable entity|too many requests|internal server error|not implemented|bad gateway|service unavailable|gateway timeout)(?: exception)?$/i;

const STATUS_MESSAGE: Record<number, string> = {
  400: 'O pedido chegou incompleto ou mal formado. Tente de novo.',
  401: 'Sua sessão não foi reconhecida. Entre de novo.',
  403: 'Você não tem permissão para isso.',
  404: 'Não encontrei o que foi pedido.',
  405: 'Esta ação não existe aqui.',
  408: 'O pedido demorou demais. Tente de novo.',
  409: 'Outra pessoa mudou isto antes. Recarregue e tente de novo.',
  413: 'O pedido ficou grande demais para enviar. Diminua o recorte e tente de novo.',
  415: 'O formato enviado não é aceito.',
  422: 'Confira os campos destacados.',
  429: 'Muitos pedidos seguidos. Espere um instante e tente de novo.',
  503: 'O serviço está fora do ar agora. Tente de novo em instantes.',
};

function inPortuguese(statusCode: number, message: string): string {
  if (!FRAMEWORK_MESSAGE.test(message.trim())) return message;

  return (
    STATUS_MESSAGE[statusCode] ??
    'Não consegui concluir. O erro foi registrado — tente de novo em instantes.'
  );
}

/** `createZodDto` entrega os erros de validação aqui; o resto da API ignora o campo. */
function readValidationDetails(errors: unknown): { field: string; message: string }[] | undefined {
  if (!Array.isArray(errors)) return undefined;

  return errors
    .filter((issue): issue is { path: unknown[]; message: string } => {
      if (typeof issue !== 'object' || issue === null) return false;

      return 'path' in issue && 'message' in issue;
    })
    .map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
}

function stackOf(exception: unknown): string | undefined {
  return exception instanceof Error ? exception.stack : undefined;
}
