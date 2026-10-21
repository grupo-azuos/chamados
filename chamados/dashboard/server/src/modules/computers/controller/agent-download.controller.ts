import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { type Response } from 'express';
import {
  agentDownloadKindSchema,
  agentVersionSchema,
} from '@template/shared/schemas/agent-release.schema';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { AgentBundleService } from '../service/agent-bundle.service';
import { AgentDownloadService } from '../service/agent-download.service';
import {
  AgentBundleRequestDto,
  AgentDownloadQueryDto,
  AgentLtsDto,
  AgentFileLinkDto,
  AgentReleaseItemDto,
} from '../dto/agent-download.dto';

@ApiTags('Download do agente')
@ApiUnauthorizedResponse({ description: 'Entre no sistema para baixar o agente.' })
@ApiForbiddenResponse({ description: 'Requer acesso a Infraestrutura ou Sistema.' })
@AnyModule()
@Controller('agent/downloads')
export class AgentDownloadController {
  constructor(
    private readonly service: AgentDownloadService,
    private readonly bundles: AgentBundleService,
  ) {}

  /** POST porque o token pode ir no corpo — num GET ele ficaria no endereço e nos logs. */
  @Post('bundle')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Monta o pacote de instalação (.zip) com MSI, certificado e scripts',
    description:
      'Com `token` e `computerId`, o install-agent.ps1 do pacote já leva o token da máquina; sem eles, o script pergunta na instalação.',
  })
  @ApiProduces('application/zip')
  @ApiOkResponse({ description: 'O pacote de instalação, pronto para baixar.' })
  async bundle(
    @CurrentUser() user: RequestUser,
    @Body() body: AgentBundleRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const bundle = await this.bundles.bundle(user, body);
    response.set({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${bundle.fileName}"`,
    });

    return new StreamableFile(bundle.content);
  }

  @Get('lts')
  @ApiOperation({ summary: 'Consulta a versão LTS disponível para instalação' })
  @ApiOkResponse({ type: AgentLtsDto })
  @ApiNoContentResponse({ description: 'Nenhuma versão LTS promovida.' })
  async lts(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentLtsDto | undefined> {
    response.setHeader('Cache-Control', 'no-store');
    const release = await this.service.lts(user);
    if (release) return release;
    response.status(204);
  }

  @Get('lts/:kind')
  @ApiOperation({ summary: 'Gera um link temporário para um arquivo da versão LTS' })
  @ApiParam({ name: 'kind', enum: agentDownloadKindSchema.options })
  @ApiOkResponse({ type: AgentFileLinkDto })
  async download(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Query() query: AgentDownloadQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentFileLinkDto> {
    response.setHeader('Cache-Control', 'no-store');
    const parsed = agentDownloadKindSchema.safeParse(kind);
    if (!parsed.success) throw new BadRequestException('Escolha um dos arquivos do agente.');
    return this.service.download(user, parsed.data, query.version);
  }

  @Get('releases')
  @ApiOperation({ summary: 'Lista as versões do agente publicadas' })
  @ApiOkResponse({ type: [AgentReleaseItemDto] })
  async releases(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentReleaseItemDto[]> {
    response.setHeader('Cache-Control', 'no-store');
    return this.service.releases(user);
  }

  @Get('releases/:version/:kind')
  @ApiOperation({ summary: 'Gera link temporário para arquivo de uma versão publicada' })
  @ApiParam({ name: 'version', example: '1.2.3' })
  @ApiParam({ name: 'kind', enum: agentDownloadKindSchema.options })
  @ApiOkResponse({ type: AgentFileLinkDto })
  async downloadVersion(
    @CurrentUser() user: RequestUser,
    @Param('version') version: string,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentFileLinkDto> {
    response.setHeader('Cache-Control', 'no-store');
    const parsedKind = agentDownloadKindSchema.safeParse(kind);
    if (!parsedKind.success) throw new BadRequestException('Escolha um dos arquivos do agente.');
    const parsedVersion = agentVersionSchema.safeParse(version);
    if (!parsedVersion.success) throw new BadRequestException('Versão do agente inválida.');
    return this.service.downloadVersion(user, parsedKind.data, parsedVersion.data);
  }
}
