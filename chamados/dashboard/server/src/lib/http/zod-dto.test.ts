import { type OpenAPIObject } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createZodDto, openApiSchemaOf, withZodSchemas, zodSchemaOf } from './zod-dto';

const schema = z.object({
  title: z.string().trim().min(1),
  dueAt: z.iso.datetime().nullable(),
  page: z.coerce.number().int().default(1),
});

class SampleDto extends createZodDto(schema) {}

describe('createZodDto', () => {
  // feliz
  it('keeps the Zod schema on the class, for the validation pipe and z.infer', () => {
    expect(zodSchemaOf(SampleDto)).toBe(schema);
    expect(SampleDto.schema).toBe(schema);
  });

  // feliz
  it('describes each field to Swagger, with the required flag', () => {
    const properties = (
      SampleDto as unknown as {
        _OPENAPI_METADATA_FACTORY: () => Record<string, { required: boolean; type?: string }>;
      }
    )._OPENAPI_METADATA_FACTORY();

    expect(properties.title).toMatchObject({ type: 'string', required: true });
    expect(properties.page).toMatchObject({ required: false });
  });

  // feliz
  it('publishes preprocess and transform fields like nestjs-zod did: required, with the real type', () => {
    const jsonSchema = openApiSchemaOf(
      z.object({
        days: z.preprocess((value) => (value === '' ? undefined : value), z.number().optional()),
        owner: z
          .string()
          .trim()
          .transform((value) => value || 'none'),
        isPartial: z.boolean().default(false),
        address: z.object({ street: z.string().default('') }).prefault({}),
      }),
    );

    expect(jsonSchema.required).toEqual(['days', 'owner']);
    expect(jsonSchema.properties).toMatchObject({
      days: { type: 'number' },
      owner: { type: 'string' },
      isPartial: { type: 'boolean', default: false },
    });
  });

  // feliz
  it('gives a union field the common type of its options, which Swagger requires', () => {
    class UnionDto extends createZodDto(
      z.object({
        email: z
          .email()
          .nullable()
          .or(z.literal('').transform(() => null)),
        mixed: z.union([z.string(), z.number()]),
      }),
    ) {}

    const properties = (
      UnionDto as unknown as { _OPENAPI_METADATA_FACTORY: () => Record<string, { type: unknown }> }
    )._OPENAPI_METADATA_FACTORY();

    expect(properties.email?.type).toBe('string');
    expect(properties.mixed?.type).toBe('object');
  });

  // triste
  it('does not treat an ordinary class as a Zod DTO', () => {
    class Plain {}
    class WithSchema {
      static readonly schema = schema;
    }

    expect(zodSchemaOf(Plain)).toBeUndefined();
    expect(zodSchemaOf(WithSchema)).toBeUndefined();
    expect(zodSchemaOf(undefined)).toBeUndefined();
  });
});

describe('withZodSchemas', () => {
  // feliz
  it('replaces the DTO component with the complete OpenAPI 3.0 schema', () => {
    (
      SampleDto as unknown as { _OPENAPI_METADATA_FACTORY: () => unknown }
    )._OPENAPI_METADATA_FACTORY();
    const document = {
      components: { schemas: { SampleDto: { type: 'object' } } },
    } as unknown as OpenAPIObject;

    const schemas = withZodSchemas(document).components?.schemas as Record<
      string,
      Record<string, unknown>
    >;

    expect(schemas.SampleDto).toEqual(openApiSchemaOf(schema));
    expect(schemas.SampleDto).not.toHaveProperty('$schema');
    expect(JSON.stringify(schemas.SampleDto)).toContain('"nullable":true');
  });

  // triste
  it('leaves a document without components untouched', () => {
    const document = { openapi: '3.0.0' } as unknown as OpenAPIObject;

    expect(withZodSchemas(document)).toBe(document);
  });
});
