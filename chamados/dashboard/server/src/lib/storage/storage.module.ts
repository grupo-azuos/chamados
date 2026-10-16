import { S3Client } from '@aws-sdk/client-s3';
import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { StorageService } from './storage.service';
import { OBJECT_STORAGE } from './storage.token';

/** Guardado à parte do provider para o desligamento conseguir fechar os sockets. */
let destroy: (() => void) | null = null;

/**
 * Um cliente S3 para o processo inteiro — Supabase Storage, AWS, MinIO ou R2, conforme o
 * `.env` (o mesmo arranjo da Gestão de RH).
 *
 * Global pela mesma razão do banco: qualquer feature que guarde arquivo precisa dele, e o
 * cliente mantém um pool de conexões HTTP — um por módulo multiplicaria isso sem ganho.
 *
 * `forcePathStyle` vem ligado: o Supabase e o MinIO endereçam o bucket no caminho
 * (`/bucket/chave`), e não num subdomínio que nem existe no DNS deles.
 */
@Global()
@Module({
  providers: [
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
        destroy = () => client.destroy();

        new Logger(StorageModule.name).log(`S3 storage on bucket ${env.S3_BUCKET}`);

        return client;
      },
    },
    StorageService,
  ],
  exports: [StorageService, OBJECT_STORAGE],
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
