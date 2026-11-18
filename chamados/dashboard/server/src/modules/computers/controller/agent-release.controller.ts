import { VERSION_NEUTRAL, Controller, Get, Headers, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type Response } from 'express';

import { Public } from '../../../lib/auth/public.decorator';
import { API_MAJOR } from '../../../lib/http/api-version';
import { AgentReleaseDownloadDto } from '../dto/agent-release.dto';
import { AgentReleaseService } from '../service/agent-release.service';

@ApiTags('Atualização do agente')
// Agentes já instalados consultam `/api/agent/...`, sem versão; o caminho antigo segue respondendo.
@Controller({ path: 'agent/releases', version: [API_MAJOR, VERSION_NEUTRAL] })
export class AgentReleaseController {
  constructor(private readonly releases: AgentReleaseService) {}

  // Não exige sessão humana: o service autentica a mesma chave de máquina usada no WebSocket.
  @Public()
  @Get('latest')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consulta a versão do agente usando a chave do computador' })
  @ApiOkResponse({ type: AgentReleaseDownloadDto })
  @ApiNoContentResponse({ description: 'Nenhuma versão publicada.' })
  @ApiUnauthorizedResponse({ description: 'Chave ausente, inválida ou revogada.' })
  @ApiForbiddenResponse({ description: 'Computador bloqueado.' })
  async latest(
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentReleaseDownloadDto | undefined> {
    response.setHeader('Cache-Control', 'no-store');
    const release = await this.releases.latest(authorization);
    if (release) return release;
    response.status(204);
  }
}
