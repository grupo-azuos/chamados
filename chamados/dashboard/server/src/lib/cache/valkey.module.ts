import { Global, Module } from '@nestjs/common';
import { ValkeyCache } from './valkey-cache';
@Global()
@Module({ providers: [ValkeyCache], exports: [ValkeyCache] })
export class ValkeyModule {}
