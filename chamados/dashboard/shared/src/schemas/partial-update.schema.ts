import { z } from 'zod';

/**
 * O schema de EDIÇÃO a partir do de criação: todo campo vira opcional, e campo ausente continua
 * ausente.
 *
 * No Zod 4 o `.default()` vale até dentro do `.optional()`: com `.partial()`, uma edição que manda
 * só `{ status }` gravaria também o valor padrão dos outros campos, por cima do que está salvo. Aqui
 * o `default` sai; quem cria continua usando o schema de criação, com os padrões.
 */
export function partialUpdate<TShape extends z.ZodRawShape>(
  schema: z.ZodObject<TShape>,
): z.ZodObject<{
  [Key in keyof TShape]: z.ZodOptional<z.ZodType<z.output<TShape[Key]>, z.input<TShape[Key]>>>;
}> {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      withoutDefault(field as z.ZodType).optional(),
    ]),
  );

  return z.object(shape) as never;
}

function withoutDefault(field: z.ZodType): z.ZodType {
  return field instanceof z.ZodDefault ? (field.unwrap() as z.ZodType) : field;
}
