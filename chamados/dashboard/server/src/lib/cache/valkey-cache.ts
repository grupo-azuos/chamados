import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import Valkey from 'iovalkey';

import { type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';

/** Só cache regenerável. Sessões, credenciais, filas e decisões de autorização ficam fora. */
@Injectable()
export class ValkeyCache implements OnApplicationShutdown {
  private readonly client: Valkey | undefined;
  private warnedAt = 0;
  private connection: Promise<void> = Promise.resolve();
  private readonly logger = new Logger(ValkeyCache.name);

  constructor(@Inject(ENV) env: Env) {
    if (!env.VALKEY_URL) return;
    this.client = new Valkey(env.VALKEY_URL, {
      keyPrefix: `${env.VALKEY_KEY_PREFIX}:`,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: env.VALKEY_TIMEOUT_MS,
      commandTimeout: env.VALKEY_TIMEOUT_MS,
      retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
    });
    this.client.on('error', () => this.warn());
    this.connection = this.client
      .connect()
      .then(() => undefined)
      .catch(() => this.warn());
  }

  async ready(): Promise<boolean> {
    await this.connection;
    return this.client?.status === 'ready';
  }

  async remember<T>(key: string, seconds: number, load: () => Promise<T>): Promise<T> {
    if (!this.client || this.client.status !== 'ready') return load();
    const cached = await this.client.get(key).catch(() => null);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        /* Entrada inválida é tratada como miss. */
      }
    }
    const value = await load();
    await this.client.set(key, JSON.stringify(value), 'EX', seconds).catch(() => this.warn());
    return value;
  }

  onApplicationShutdown(): void {
    this.client?.disconnect();
  }

  private warn(): void {
    if (Date.now() - this.warnedAt < 60000) return;
    this.warnedAt = Date.now();
    this.logger.warn('Valkey cache is unavailable; reading the source without caching');
  }
}
