import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { GithubIntegrationModule } from '../github-integration/github-integration.module';
import { SoftwareProjectsModule } from '../software-projects/software-projects.module';
import { TicketsModule } from '../tickets/tickets.module';
import { GithubWebhooksController } from './controller/github-webhooks.controller';
import { GithubWebhooksRepository } from './repository/github-webhooks.repository';
import { GithubWebhooksService } from './service/github-webhooks.service';

/** O webhook do GitHub App: guarda cada aviso e o leva para a timeline e para os chamados. */
@Module({
  imports: [AuthModule, GithubIntegrationModule, SoftwareProjectsModule, TicketsModule],
  controllers: [GithubWebhooksController],
  providers: [GithubWebhooksRepository, GithubWebhooksService],
  exports: [GithubWebhooksRepository],
})
export class GithubWebhooksModule {}
