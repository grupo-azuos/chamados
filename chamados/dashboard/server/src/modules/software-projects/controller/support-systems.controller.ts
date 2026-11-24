import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { ProjectMapDto, SupportProjectMapQueryDto } from '../dto/software-project.dto';
import { SoftwareProjectsService } from '../service/software-projects.service';

/**
 * Os SISTEMAS NA CENTRAL — o que quem pede chamado pode ver de um sistema. Não é de um módulo:
 * basta estar identificado (ver `SoftwareProjectsService.supportMap`).
 */
@ApiTags('Central')
@AnyModule()
@Controller('support/systems')
export class SupportSystemsController {
  constructor(private readonly service: SoftwareProjectsService) {}

  @Get(':id/map')
  @ApiOperation({
    summary: 'O mapa completo de um sistema, para quem pede chamado',
    description:
      'O mesmo mapa da tela de Projetos (git graph, issues, PRs, merges, chamados e tarefas) de UM sistema. `from`/`to` recortam o período e `personId` a pessoa.',
  })
  @ApiOkResponse({ type: ProjectMapDto })
  @ApiNotFoundResponse({ description: 'O sistema não existe ou foi arquivado.' })
  async map(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SupportProjectMapQueryDto,
  ): Promise<ProjectMapDto> {
    return this.service.supportMap(id, query);
  }
}
