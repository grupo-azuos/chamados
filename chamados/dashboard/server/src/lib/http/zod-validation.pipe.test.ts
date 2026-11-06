import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createZodDto } from './zod-dto';
import { ZodValidationException, ZodValidationPipe } from './zod-validation.pipe';

class CreateDto extends createZodDto(
  z.object({
    title: z.string().trim().min(1, 'Informe o título'),
    page: z.coerce.number().default(1),
  }),
) {}

const pipe = new ZodValidationPipe();

describe('ZodValidationPipe', () => {
  // feliz
  it('returns the parsed value, with trim, coercion and defaults applied', () => {
    expect(pipe.transform({ title: '  Revisar  ' }, { type: 'body', metatype: CreateDto })).toEqual(
      {
        title: 'Revisar',
        page: 1,
      },
    );
  });

  // feliz
  it('lets parameters that are not Zod DTOs pass untouched', () => {
    expect(pipe.transform('42', { type: 'param', metatype: String })).toBe('42');
  });

  // triste
  it('refuses with 400 and the issues in errors, the shape the exception filter translates', () => {
    try {
      pipe.transform({ title: '   ' }, { type: 'body', metatype: CreateDto });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toBeInstanceOf(ZodValidationException);
      expect((error as ZodValidationException).getZodError().issues).toHaveLength(1);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: { path: string[]; message: string }[];
      };
      expect(response.message).toBe('Validation failed');
      expect(response.errors[0]).toMatchObject({ path: ['title'], message: 'Informe o título' });
    }
  });
});
