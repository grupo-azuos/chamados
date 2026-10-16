import { z } from 'zod';

/** O bucket guarda chaves; só a API autenticada transforma essas chaves em URLs temporárias. */
const versionSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
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
    version: versionSchema,
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
  version: versionSchema,
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().positive(),
});
export type AgentReleaseManifest = z.infer<typeof agentReleaseManifestSchema>;
export type AgentReleaseDownload = z.infer<typeof agentReleaseDownloadSchema>;
