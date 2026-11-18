import { type OpenAPIObject } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * DTO feito do MESMO schema Zod que a web importa: a validação em runtime (`ZodValidationPipe`) e o
 * contrato publicado no Swagger saem do mesmo lugar e não podem divergir.
 *
 * `class CreateTaskDto extends createZodDto(createTaskSchema) {}` — o tipo da instância é o que o
 * schema devolve, e o Swagger descobre os campos pelo `_OPENAPI_METADATA_FACTORY`, a mesma porta que
 * o plugin oficial do Nest usa.
 */
export type ZodDtoClass<TSchema extends z.ZodType = z.ZodType> = {
  new (): z.output<TSchema>;
  /* `schema`, como nos DTOs de antes: `z.infer<typeof AlgumDto.schema>` continua valendo. */
  readonly schema: TSchema;
  readonly isZodDto: true;
};

/** Schema de cada DTO pelo nome da classe, que é o nome do componente no documento OpenAPI. */
const schemasByName = new Map<string, z.ZodType>();

/**
 * JSON Schema no dialeto do OpenAPI 3.0; o que não tem equivalente (Date, por exemplo) vira livre.
 * O contrato é o mesmo que o nestjs-zod publicava, para o cliente gerado pelo `openapi-typescript`
 * não mudar: o campo só é opcional quando o envoltório de fora é `.optional()`, `.default()` ou
 * `.prefault()` (o `.default()` do Zod 3), e o `z.preprocess` mostra o schema de dentro (o que chega
 * no controller), não a função.
 */
export function openApiSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
    override: ({ zodSchema, jsonSchema: converted }) => {
      const def = zodSchema._zod.def;
      if (def.type === 'pipe' && def.in._zod.def.type === 'transform') {
        replaceWith(converted, openApiSchemaOf(def.out as z.ZodType));
      }
      if (def.type === 'object') requireAllButOptional(converted, def.shape);
    },
  }) as Record<string, unknown>;

  return jsonSchema;
}

const OPTIONAL_WRAPPERS = new Set(['optional', 'default', 'prefault']);

function requireAllButOptional(
  converted: Record<string, unknown>,
  shape: Record<string, z.core.$ZodType>,
): void {
  const required = Object.entries(shape)
    .filter(([, field]) => !OPTIONAL_WRAPPERS.has(field._zod.def.type))
    .map(([key]) => key);
  if (required.length > 0) converted.required = required;
  else delete converted.required;
}

function replaceWith(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
}

export function createZodDto<TSchema extends z.ZodType>(schema: TSchema): ZodDtoClass<TSchema> {
  class ZodDto {
    static readonly schema = schema;
    static readonly isZodDto = true;

    /* O Swagger chama isto com `this` sendo a classe filha (`CreateTaskDto`): o nome dela é o
       nome do componente que `withZodSchemas` completa depois. */
    static _OPENAPI_METADATA_FACTORY(this: { name: string }): Record<string, unknown> {
      schemasByName.set(this.name, schema);

      return propertiesOf(openApiSchemaOf(schema));
    }
  }

  return ZodDto as unknown as ZodDtoClass<TSchema>;
}

/** O schema Zod de um tipo de parâmetro, quando ele é um DTO de `createZodDto`. */
export function zodSchemaOf(type: unknown): z.ZodType | undefined {
  if (typeof type !== 'function' || !('isZodDto' in type)) return undefined;

  return (type as ZodDtoClass).schema;
}

/**
 * Troca o componente de cada DTO pelo JSON Schema completo do Zod (formatos, limites, enum,
 * nulos). O Swagger monta o componente a partir das propriedades soltas; o schema inteiro é o
 * contrato de verdade.
 */
export function withZodSchemas(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas;
  if (!schemas) return document;

  for (const [name, schema] of schemasByName) {
    if (name in schemas) schemas[name] = openApiSchemaOf(schema);
  }

  return document;
}

/* Cada propriedade vira as opções de um `@ApiProperty`: é o que o Swagger usa nos parâmetros de
   `@Query()`, campo por campo. */
function propertiesOf(jsonSchema: Record<string, unknown>): Record<string, unknown> {
  const properties = (jsonSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = new Set((jsonSchema.required ?? []) as string[]);

  return Object.fromEntries(
    Object.entries(properties).map(([key, property]) => [
      key,
      { ...property, type: typeOf(property), required: required.has(key) },
    ]),
  );
}

/* Sem `type` (uma união vira `anyOf`), o Swagger tenta deduzir o tipo pela classe e recusa o DTO.
   Vale o tipo comum das opções; se elas forem de tipos diferentes, `object`. */
function typeOf(property: Record<string, unknown>): unknown {
  if (property.type) return property.type;

  const options = (property.anyOf ?? property.oneOf ?? property.allOf ?? []) as {
    type?: unknown;
  }[];
  const types = new Set(options.map((option) => option.type).filter(Boolean));

  return types.size === 1 ? [...types][0] : 'object';
}
