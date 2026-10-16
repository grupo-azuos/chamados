import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { type FileStorage, type StoredFile } from './file-storage.type';

export type S3StorageOptions = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** O `host:porta` com que o provedor confere a assinatura, quando não é o do endpoint. */
  signingHost?: string;
};

/** O S3 apaga no máximo mil chaves por pedido. */
const DELETE_BATCH = 1000;

/**
 * O storage pelo protocolo S3 — Supabase, AWS, MinIO ou R2, conforme o `.env`.
 *
 * O arquivo vai do navegador direto para o storage, por URL assinada; a API só emite a URL e
 * faz o que é do servidor (conferir, mover da área temporária, apagar). O controle de quem mexe
 * em qual chamado, produto ou orçamento continua no service, antes de chegar aqui.
 *
 * O mesmo arranjo do Paralegal, da Gestão de RH e do admin-console.
 */
export class S3Storage implements FileStorage {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
    if (options.signingHost) signAs(this.client, options.signingHost);
  }

  async uploadUrl(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn },
    );
  }

  async downloadUrl(key: string, expiresIn: number, downloadAs: string | null): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      ...(downloadAs ? { ResponseContentDisposition: attachmentDisposition(downloadAs) } : {}),
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async get(key: string): Promise<{ content: Buffer; contentType: string | null } | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      if (!object.Body) return null;

      return {
        content: Buffer.from(await object.Body.transformToByteArray()),
        contentType: object.ContentType ?? null,
      };
    } catch (error) {
      /* Arquivo que não existe é resposta legítima ("não achei"), não falha do storage. */
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async put(key: string, content: Buffer, contentType: string | null): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: content,
        ContentType: contentType ?? undefined,
      }),
    );
  }

  async head(key: string): Promise<{ size: number | null; contentType: string | null } | null> {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );

      return { size: object.ContentLength ?? null, contentType: object.ContentType ?? null };
    } catch (error) {
      /* O HEAD não tem corpo para dizer `NoSuchKey`: o "não achei" dele é `NotFound`. */
      if (error instanceof NotFound) return null;
      throw error;
    }
  }

  /** O S3 não tem "mover": é copiar dentro do storage e apagar a origem. */
  async move(from: string, to: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.options.bucket,
        Key: to,
        CopySource: copySource(this.options.bucket, from),
      }),
    );
    await this.remove([from]);
  }

  /**
   * O S3 lista em ordem de NOME, não de data — por isso o filtro vem de quem chama, página a
   * página, até juntar `limit` arquivos.
   */
  async list(
    prefix: string,
    limit: number,
    keep: (file: StoredFile) => boolean,
  ): Promise<StoredFile[]> {
    const found: StoredFile[] = [];
    let token: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.options.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      const files = (page.Contents ?? []).flatMap((object) =>
        object.Key ? [{ key: object.Key, lastModified: object.LastModified ?? null }] : [],
      );
      found.push(...files.filter(keep));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token && found.length < limit);

    return found.slice(0, limit);
  }

  async remove(keys: string[]): Promise<void> {
    for (let start = 0; start < keys.length; start += DELETE_BATCH) {
      const batch = keys.slice(start, start + DELETE_BATCH);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })), Quiet: true },
        }),
      );
    }
  }
}

/**
 * Assina como `host`, mas continua chamando o endpoint.
 *
 * Existe por causa do Supabase self-hosted: o Kong da frente repassa ao Storage a porta de
 * DENTRO dele (8000), e o Storage confere a assinatura com ela — qualquer que seja a porta por
 * onde se chegou. Troca o cabeçalho `Host` que o SDK preencheu a partir do endpoint: a
 * assinatura (da chamada e da URL assinada) cobre o host que o provedor confere, e o endereço
 * da conexão e da URL continua o do endpoint.
 */
export function signAs(client: S3Client, host: string): void {
  /* Mesmo passo e mesma prioridade do `hostHeaderMiddleware`, e acrescentado DEPOIS dele (que
     entra na criação do cliente): roda logo em seguida, antes de qualquer assinatura. */
  client.middlewareStack.add(
    (next) => async (args) => {
      const request = args.request as { headers?: Record<string, string> };
      if (request.headers) request.headers.host = host;

      return next(args);
    },
    { step: 'build', priority: 'low', name: 'signingHostMiddleware' },
  );
}

/**
 * O nome que o navegador usa ao SALVAR. `filename*` leva o nome com acento (RFC 5987), e
 * `filename` leva uma versão sem acento para quem não entende o primeiro.
 */
export function attachmentDisposition(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_');

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** A origem da cópia vai codificada, como o S3 pede — as chaves têm espaço e parênteses. */
function copySource(bucket: string, key: string): string {
  return `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
