import { GetObjectCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { OBJECT_STORAGE } from '../../../lib/storage/storage.token';

const MANIFEST_MAX_BYTES = 16_384;
const STORAGE_TIMEOUT_MS = 10_000;
const RELEASES_PREFIX = 'agent/releases/';
const VERSION_FOLDER = /^agent\/releases\/(\d+\.\d+\.\d+)\/$/;

@Injectable()
export class AgentReleaseRepository {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly client: S3Client,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async latest(): Promise<unknown | null> {
    return this.readJson('agent/lts.json');
  }

  async manifestOf(version: string): Promise<unknown | null> {
    return this.readJson(`${RELEASES_PREFIX}${version}/latest.json`);
  }

  async listVersions(): Promise<string[]> {
    const result = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.env.S3_BUCKET,
        Prefix: RELEASES_PREFIX,
        Delimiter: '/',
        MaxKeys: 1000,
      }),
      { abortSignal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) },
    );

    return (result.CommonPrefixes ?? []).flatMap((entry) => {
      const match = VERSION_FOLDER.exec(entry.Prefix ?? '');
      return match?.[1] ? [match[1]] : [];
    });
  }

  private async readJson(key: string): Promise<unknown | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.env.S3_BUCKET,
          Key: key,
        }),
        { abortSignal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) },
      );
      if (!result.Body) return null;
      if ((result.ContentLength ?? 0) > MANIFEST_MAX_BYTES)
        throw new Error('Agent release manifest is too large');
      const content = await result.Body.transformToString();
      if (Buffer.byteLength(content) > MANIFEST_MAX_BYTES)
        throw new Error('Agent release manifest is too large');

      return JSON.parse(content) as unknown;
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') return null;
      throw error;
    }
  }
}
