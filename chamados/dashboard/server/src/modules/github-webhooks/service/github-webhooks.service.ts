import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type GithubWebhookEventRow } from '../../../lib/db/schema/github-webhook-events.schema';
import { GithubConnectionsRepository } from '../../github-integration/repository/github-connections.repository';
import { SoftwareTimelineRepository } from '../../software-projects/repository/software-timeline.repository';
import { GithubService } from '../../software-projects/service/github.service';
import { TicketHistoriesService } from '../../tickets/service/ticket-histories.service';
import { isValidGithubSignature } from '../github-signature.util';
import {
  actionOf,
  issueChangeOf,
  issueTimelineOf,
  pullRequestTimelineOf,
  repositoryFullNameOf,
  senderLoginOf,
  type WebhookHeaders,
  type WebhookTimelineItem,
} from '../mapper/github-webhooks.mapper';
import { GithubWebhooksRepository } from '../repository/github-webhooks.repository';

/** Quem fica registrado como autor do que o webhook grava na timeline. */
export const GITHUB_WEBHOOK_ACTOR = 'github-webhook';

export type GithubWebhookResult = { status: 'accepted' | 'duplicate' | 'ignored' };

/** Uma pessoa do GitHub lida no sistema: a conta vinculada vira a pessoa da base, por ID. */
type GithubPerson = { name: string; email: string; id?: string };

/**
 * O WEBHOOK DO GITHUB APP — o GitHub avisa, o sistema não pergunta.
 *
 * Um App só, instalado na organização, com acesso a todos os repositórios: cada push, PR, issue
 * e branch de qualquer sistema chega aqui na hora. A ordem não muda:
 *  1. a porta está aberta? (sem o segredo configurado, não);
 *  2. a assinatura bate? (senão, 401 — a porta é pública);
 *  3. GUARDA o aviso — antes de qualquer coisa, e uma vez só por `X-GitHub-Delivery`;
 *  4. processa, e marca o aviso como processado (ou com o erro, para ler depois).
 *
 * Falha no passo 4 não devolve erro ao GitHub: o aviso já está guardado, e um 500 só faria o
 * GitHub reenviar o mesmo aviso — que cairia no "duplicado" do passo 3.
 */
@Injectable()
export class GithubWebhooksService {
  private readonly logger = new Logger(GithubWebhooksService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly repository: GithubWebhooksRepository,
    private readonly timeline: SoftwareTimelineRepository,
    private readonly histories: TicketHistoriesService,
    private readonly github: GithubService,
    @Optional() private readonly connections?: GithubConnectionsRepository,
    @Optional()
    @Inject(USER_DIRECTORY_PROVIDER)
    private readonly directory?: UserDirectoryProvider,
  ) {}

  async receive(
    headers: WebhookHeaders,
    rawBody: Buffer | undefined,
    payload: Record<string, unknown>,
  ): Promise<GithubWebhookResult> {
    const secret = this.env.GITHUB_APP_WEBHOOK_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException(
        'O webhook do GitHub não está configurado neste servidor.',
      );
    }
    if (!rawBody || !isValidGithubSignature(secret, rawBody, headers.signature)) {
      throw new UnauthorizedException('Assinatura do GitHub inválida.');
    }
    if (!headers.deliveryId || !headers.event) {
      throw new BadRequestException('Aviso do GitHub sem identificação.');
    }

    const saved = await this.repository.save({
      deliveryId: headers.deliveryId,
      event: headers.event,
      action: actionOf(payload),
      repositoryFullName: repositoryFullNameOf(payload),
      senderLogin: senderLoginOf(payload),
      payload,
    });
    if (!saved) return { status: 'duplicate' };

    const handled = await this.process(saved);

    return { status: handled ? 'accepted' : 'ignored' };
  }

  /** Processa um aviso já guardado. Devolve se havia algo a fazer com ele. */
  async process(event: GithubWebhookEventRow): Promise<boolean> {
    try {
      const handled = await this.dispatch(event);
      await this.repository.markProcessed(event.id, null);
      return handled;
    } catch (error) {
      this.logger.error(`Aviso ${event.deliveryId} (${event.event}) falhou: ${String(error)}`);
      await this.repository.markProcessed(event.id, String(error).slice(0, 2000));
      return true;
    }
  }

  private async dispatch(event: GithubWebhookEventRow): Promise<boolean> {
    if (!event.repositoryFullName) return false;
    if (event.event !== 'issues' && event.event !== 'pull_request') return false;

    const projectId = await this.repository.findProjectIdByRepository(event.repositoryFullName);
    if (!projectId) return false;

    const item =
      event.event === 'issues'
        ? issueTimelineOf(event.payload)
        : pullRequestTimelineOf(event.payload);
    if (item) await this.writeTimeline(projectId, item);

    if (event.event === 'issues') await this.syncTicket(projectId, event);

    return true;
  }

  /** PR e issue na timeline do sistema NA HORA — a mesma linha que a sincronização escreve. */
  private async writeTimeline(projectId: number, item: WebhookTimelineItem): Promise<void> {
    const person = await this.personOf(item.author);
    await this.timeline.upsertMany(
      [{ ...item, projectId, authorName: person.name, createdBy: GITHUB_WEBHOOK_ACTOR }],
      { keepCoAuthors: true },
    );
  }

  /** Issue fechada encerra o chamado; issue reaberta reabre — ver `ticketHistoryOfIssueEvent`. */
  private async syncTicket(projectId: number, event: GithubWebhookEventRow): Promise<void> {
    const action = event.action ?? '';
    if (action !== 'closed' && action !== 'reopened') return;

    const change = issueChangeOf(event.payload);
    if (!change) return;
    const ticketId = await this.repository.findTicketIdByIssue(projectId, change.issueNumber);
    if (!ticketId) return;

    const senderLogin = event.senderLogin ?? 'github';
    const closingComment =
      action === 'closed' && event.repositoryFullName
        ? await this.closingCommentOf(event.repositoryFullName, change.issueNumber, change.closedAt)
        : null;
    const person = await this.personOf(senderLogin);

    await this.histories.recordFromGithub(
      ticketId,
      {
        action,
        stateReason: change.stateReason,
        issueNumber: change.issueNumber,
        senderLogin,
        closingComment,
      },
      person,
    );
  }

  private async closingCommentOf(
    fullName: string,
    issueNumber: number,
    closedAt: Date | null,
  ): Promise<string | null> {
    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) return null;

    return this.github.fetchClosingComment({ owner, repo }, issueNumber, closedAt ?? new Date());
  }

  /**
   * A conta do GitHub como PESSOA da base: quem vinculou o GitHub ao sistema vira o nome e o id
   * do diretório. Login sem vínculo fica como `@login (GitHub)`, sem id — e por isso nunca vira
   * responsável de nada.
   */
  private async personOf(login: string): Promise<GithubPerson> {
    const fallback = { name: `@${login} (GitHub)`, email: `github:${login}` };
    if (!this.connections || !this.directory) return fallback;

    try {
      const links = await this.connections.listLogins();
      const link = links.find((item) => item.login.toLowerCase() === login.toLowerCase());
      if (!link) return fallback;
      const user = await this.directory.getUserById(link.userId);
      if (!user) return fallback;

      return { name: user.name, email: user.email, id: user.id };
    } catch {
      return fallback;
    }
  }
}
