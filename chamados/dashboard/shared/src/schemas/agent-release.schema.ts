import { z } from 'zod';

/** O bucket guarda chaves; só a API autenticada transforma essas chaves em URLs temporárias. */
export const agentVersionSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const artifactSchema = z
  .object({
    key: z.string().regex(/^agent\/releases\/\d+\.\d+\.\d+\/[a-zA-Z0-9._-]+$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(512 * 1024 * 1024),
  })
  .strict();

export const agentReleaseManifestSchema = z
  .object({
    version: agentVersionSchema,
    publishedAt: z.string().datetime(),
    artifacts: z.object({ msi: artifactSchema, certificate: artifactSchema }).strict(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const prefix = `agent/releases/${manifest.version}/`;
    for (const [name, artifact] of Object.entries(manifest.artifacts)) {
      const extension = name === 'msi' ? '.msi' : '.cer';
      if (!artifact.key.startsWith(prefix) || !artifact.key.endsWith(extension)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Artefato não corresponde à versão ou ao formato',
          path: ['artifacts', name, 'key'],
        });
      }
    }
  });

export const agentReleaseDownloadSchema = z.object({
  version: agentVersionSchema,
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().positive(),
});
export type AgentReleaseManifest = z.infer<typeof agentReleaseManifestSchema>;
export type AgentReleaseDownload = z.infer<typeof agentReleaseDownloadSchema>;

export const agentDownloadKindSchema = z.enum(['msi', 'certificate', 'certificateScript']);
export type AgentDownloadKind = z.infer<typeof agentDownloadKindSchema>;
export const agentDownloadQuerySchema = z.object({ version: agentVersionSchema });
export const agentLtsSchema = z.object({
  version: agentVersionSchema,
  publishedAt: z.string().datetime(),
  sizeBytes: z.number().int().positive(),
});
export type AgentLts = z.infer<typeof agentLtsSchema>;
export const agentReleaseItemSchema = agentLtsSchema.extend({ isLts: z.boolean() });
export type AgentReleaseItem = z.infer<typeof agentReleaseItemSchema>;
export const agentFileLinkSchema = z.object({ version: agentVersionSchema, url: z.string().url() });
export type AgentFileLink = z.infer<typeof agentFileLinkSchema>;

/**
 * O pedido do pacote de instalação (.zip). Sem token, o script do pacote pergunta o token na
 * hora de instalar; com token, ele já vem dentro — e então a API confere que o token é mesmo
 * da máquina informada, para o pacote não sair com a chave errada.
 */
export const agentBundleRequestSchema = z
  .object({
    version: agentVersionSchema,
    serverUrl: z.string().url().max(512),
    token: z.string().min(1).max(512).optional(),
    computerId: z.number().int().positive().optional(),
  })
  .strict()
  .refine((request) => (request.token === undefined) === (request.computerId === undefined), {
    message: 'Informe o token junto com a máquina.',
    path: ['token'],
  });
export type AgentBundleRequest = z.infer<typeof agentBundleRequestSchema>;
