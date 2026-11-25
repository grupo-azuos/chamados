import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { githubWebhookResultSchema } from '@template/shared/schemas/github-webhook.schema';
import { type Request } from 'express';

import { Public } from '../../../lib/auth/public.decorator';
import { createZodDto } from '../../../lib/http/zod-dto';
import { GithubWebhooksService } from '../service/github-webhooks.service';

class GithubWebhookResultDto extends createZodDto(githubWebhookResultSchema) {}

/**
 * A PORTA DO GITHUB APP. O controller só recebe e entrega: a regra vive no service.
 *
 * `@Public()` porque quem chama é o GitHub, sem login — ele se prova pela assinatura
 * (`X-Hub-Signature-256`), conferida no service sobre o corpo cru. `@SkipThrottle()` porque um
 * merge grande manda dezenas de avisos de uma vez, e a trava de webhook (12 por minuto) perderia
 * metade; aviso sem assinatura certa é recusado antes de tocar o banco.
 */
@ApiTags('GitHub')
@Controller('github')
export class GithubWebhooksController {
  constructor(private readonly service: GithubWebhooksService) {}

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(202)
  @ApiOperation({
    summary: 'A porta do GitHub App: recebe push, PR, issue e branch',
    description:
      'Pública de propósito — o GitHub não tem login. Cada aviso é conferido pela assinatura `X-Hub-Signature-256` com o segredo `GITHUB_APP_WEBHOOK_SECRET`; sem o segredo configurado, a porta fica FECHADA (503). O aviso é guardado uma vez só por `X-GitHub-Delivery` e então processado: issue e PR vão para a timeline do sistema na hora, e fechar ou reabrir a issue de um chamado encerra ou reabre o chamado.',
  })
  @ApiAcceptedResponse({ type: GithubWebhookResultDto })
  @ApiUnauthorizedResponse({ description: 'Assinatura do GitHub inválida.' })
  @ApiServiceUnavailableResponse({ description: 'Webhook do GitHub não configurado.' })
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-github-event') event: string | undefined,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: Record<string, unknown>,
  ): Promise<GithubWebhookResultDto> {
    return this.service.receive({ deliveryId, event, signature }, request.rawBody, payload ?? {});
  }
}
