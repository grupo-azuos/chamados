import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { OBJECT_STORAGE } from '../../../lib/storage/storage.token';

@Injectable()
export class AgentReleaseRepository {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly client: S3Client,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async latest(): Promise<unknown | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.env.S3_BUCKET,
          Key: 'agent/latest.json',
        }),
        { abortSignal: AbortSignal.timeout(10_000) },
      );
      if (!result.Body) return null;
      if ((result.ContentLength ?? 0) > 16_384)
        throw new Error('Agent release manifest is too large');
      const content = await result.Body.transformToString();
      if (Buffer.byteLength(content) > 16_384)
        throw new Error('Agent release manifest is too large');

      return JSON.parse(content) as unknown;
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') return null;
      throw error;
    }
  }
}
