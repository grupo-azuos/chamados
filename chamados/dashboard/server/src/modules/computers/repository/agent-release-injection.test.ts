import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { ENV } from '../../../lib/config/env.token';
import { StorageModule } from '../../../lib/storage/storage.module';
import { AgentReleaseRepository } from './agent-release.repository';

@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useValue: {
        S3_REGION: 'us-east-1',
        S3_ENDPOINT: 'https://storage.example.test',
        S3_BUCKET: 'fixture',
        S3_FORCE_PATH_STYLE: true,
        S3_ACCESS_KEY_ID: 'fixture',
        S3_SECRET_ACCESS_KEY: 'fixture',
      },
    },
  ],
  exports: [ENV],
})
class TestEnvironmentModule {}

describe('agent release storage injection', () => {
  // feliz: o módulo real exporta o cliente compartilhado, sem abrir outra conexão S3.
  it('constructs the repository with the real global storage module', async () => {
    const module = await Test.createTestingModule({
      imports: [TestEnvironmentModule, StorageModule],
      providers: [AgentReleaseRepository],
    }).compile();
    expect(module.get(AgentReleaseRepository)).toBeInstanceOf(AgentReleaseRepository);
    await module.close();
  });
});
