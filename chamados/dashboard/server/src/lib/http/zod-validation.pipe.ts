import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

import { type ZodError } from 'zod';

import { zodSchemaOf } from './zod-dto';

/** A recusa do pipe: 400 com os problemas em `errors`, e o `ZodError` original para quem precisar. */
export class ZodValidationException extends BadRequestException {
  constructor(private readonly zodError: ZodError) {
    super({ statusCode: 400, message: 'Validation failed', errors: zodError.issues });
  }

  getZodError(): ZodError {
    return this.zodError;
  }
}

/**
 * Valida `@Body()`, `@Query()` e `@Param()` cujo tipo é um DTO de `createZodDto`; o resto passa
 * direto. O valor que segue para o controller é o do schema (com `trim`, `default` e coerção).
 *
 * A recusa mantém o formato de sempre — 400 com os problemas em `errors` —, que o
 * `HttpExceptionFilter` traduz para a mensagem em português com o detalhe de cada campo.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = zodSchemaOf(metadata.metatype);
    if (!schema) return value;

    const result = schema.safeParse(value);
    if (result.success) return result.data;

    throw new ZodValidationException(result.error);
  }
}
