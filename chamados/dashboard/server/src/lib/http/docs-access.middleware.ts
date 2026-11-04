import { type NextFunction, type Request, type Response } from 'express';

/** Cobre Swagger e todos os JSON de versão antes de registrar as rotas no Express. */
export function docsAccess(nodeEnv: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (
      nodeEnv !== 'production' ||
      ['admin', 'manager'].includes(String(request.headers['x-forwarded-user-role']))
    )
      return next();
    response.status(403).json({
      error: { status: 403, detail: 'A documentação é restrita a administradores e gestores.' },
    });
  };
}
