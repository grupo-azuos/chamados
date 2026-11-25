import { z } from 'zod';

/**
 * ARQUIVAR, NUNCA APAGAR — o que a casa decidiu para tudo o que este sistema guarda.
 *
 * Nenhum botão de excluir, tirar ou desvincular apaga a linha: ele a ARQUIVA. Arquivado, o
 * registro some da tela (o filtro `archived` o traz de volta), o arquivo continua no bucket, e
 * quem arquivou e quando ficam guardados. "Desfazer" devolve o registro como estava.
 */
export const archiveSchema = z
  .object({
    archivedAt: z.iso.datetime({ offset: true }),
    /** O id de quem arquivou, pela identidade. Nulo quando foi o próprio sistema. */
    archivedBy: z.string().nullable(),
  })
  .nullable();

/** Nulo enquanto o registro está em uso. */
export type Archive = z.infer<typeof archiveSchema>;

/**
 * O filtro de toda lista que arquiva: `hide` (o padrão) esconde os arquivados, `only` traz só
 * eles — é o que o bloco "Removidos" pede — e `show` traz tudo.
 */
export const ARCHIVED_FILTERS = ['hide', 'show', 'only'] as const;

export const archivedFilterSchema = z.enum(ARCHIVED_FILTERS).default('hide');

export type ArchivedFilter = z.infer<typeof archivedFilterSchema>;

/** A query de quem só filtra pelo arquivamento. */
export const archivedQuerySchema = z.object({ archived: archivedFilterSchema });

export type ArchivedQuery = z.infer<typeof archivedQuerySchema>;
