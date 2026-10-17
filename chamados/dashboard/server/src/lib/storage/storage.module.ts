import { S3Client } from '@aws-sdk/client-s3';
import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { type FileStorage } from './file-storage.type';
import { S3Storage, signAs } from './s3-storage';
import { StagedUploadsService } from './staged-uploads.service';
import { OBJECT_STORAGE, STORAGE } from './storage.token';

/** Guardado à parte do provider para o desligamento conseguir fechar os sockets. */
let destroy: (() => void) | null = null;

/**
 * O storage do processo inteiro — Supabase Storage, AWS, MinIO ou R2, conforme o `.env` (o
 * mesmo arranjo do Paralegal e da Gestão de RH).
 *
 * Global pela mesma razão do banco: qualquer feature que guarde arquivo precisa dele.
 *
 * `forcePathStyle` vem ligado: o Supabase e o MinIO endereçam o bucket no caminho
 * (`/bucket/chave`), e não num subdomínio que nem existe no DNS deles.
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ENV],
      useFactory: (env: Env): FileStorage => {
        new Logger(StorageModule.name).log(`S3 storage on bucket ${env.S3_BUCKET}`);

        return new S3Storage({
          bucket: env.S3_BUCKET,
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          signingHost: env.S3_SIGNING_HOST,
        });
      },
    },
    {
      provide: OBJECT_STORAGE,
      inject: [ENV],
      useFactory: (env: Env): S3Client => {
        const client = new S3Client({
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          credentials: {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          },
        });
        /* A mesma assinatura do `STORAGE`: sem ela, na homologação o manifesto do agente
           voltaria `SignatureDoesNotMatch`. */
        if (env.S3_SIGNING_HOST) signAs(client, env.S3_SIGNING_HOST);
        destroy = () => client.destroy();

        return client;
      },
    },
    StagedUploadsService,
  ],
  exports: [STORAGE, OBJECT_STORAGE, StagedUploadsService],
})
export class StorageModule implements OnApplicationShutdown {
  private readonly logger = new Logger(StorageModule.name);

  onApplicationShutdown(): void {
    if (!destroy) return;

    destroy();
    destroy = null;
    this.logger.log('Object storage client closed.');
  }
}
