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

/* A descrição (`.describe()`) que estava no `.default()` acompanha o campo: é ela que o Swagger
   publica, e sem ela o contrato da edição sairia sem dizer o que o campo é. */
function withoutDefault(field: z.ZodType): z.ZodType {
  if (!(field instanceof z.ZodDefault)) return field;

  const inner = field.unwrap() as z.ZodType;
  const meta = field.meta();

  return meta ? inner.meta(meta) : inner;
}
