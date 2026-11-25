import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { AnyModule, ReadOnlyAction } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { SkipHistory } from '../../history/interceptor/skip-history.decorator';
import {
  BoardDto,
  BoardParamsDto,
  FilterParamsDto,
  ModuleParamsDto,
  SaveBoardDto,
  SavedFilterDto,
  SavedFilterListDto,
  SavedFilterQueryDto,
  SaveFilterDto,
  WidgetDataDto,
  WidgetQueryDto,
} from '../dto/dashboard-boards.dto';
import { DashboardBoardsService } from '../service/dashboard-boards.service';

/**
 * OS PAINÉIS DE CADA MÓDULO — Equipe, Gestor e Pessoal, montados pela própria equipe.
 *
 * `@AnyModule`: o módulo vem no endereço, e o service confere o acesso da pessoa a ele. As
 * escritas são `@ReadOnlyAction` para o MÓDULO: montar o próprio painel não muda dado de
 * ninguém, e quem só consulta o módulo também monta o seu Pessoal — quem pode o quê é do service.
 */
@ApiTags('Painéis')
@AnyModule()
@Controller('dashboard-boards')
export class DashboardBoardsController {
  constructor(private readonly service: DashboardBoardsService) {}

  @Get(':module/filters')
  @ApiOperation({
    summary: 'Os filtros salvos do módulo',
    description: 'Os da pessoa e os compartilhados. `?archived=only` traz os arquivados.',
  })
  @ApiOkResponse({ type: SavedFilterListDto })
  async filters(
    @CurrentUser() user: RequestUser,
    @Param() params: ModuleParamsDto,
    @Query() query: SavedFilterQueryDto,
  ): Promise<SavedFilterDto[]> {
    return this.service.filters(user, params.module, query.archived);
  }

  @Post(':module/filters')
  @ReadOnlyAction()
  @ApiOperation({ summary: 'Salva um filtro novo no módulo' })
  @ApiOkResponse({ type: SavedFilterDto })
  @ApiUnprocessableEntityResponse({ description: 'O filtro tem campo de outra fonte ou é grande demais.' })
  async createFilter(
    @CurrentUser() user: RequestUser,
    @Param() params: ModuleParamsDto,
    @Body() body: SaveFilterDto,
  ): Promise<SavedFilterDto> {
    return this.service.createFilter(user, params.module, body);
  }

  @Put(':module/filters/:id')
  @ReadOnlyAction()
  @ApiOperation({ summary: 'Muda um filtro salvo', description: 'Só quem criou, ou o administrador do módulo.' })
  @ApiOkResponse({ type: SavedFilterDto })
  @ApiForbiddenResponse({ description: 'O filtro é de outra pessoa.' })
  @ApiNotFoundResponse({ description: 'Filtro não encontrado.' })
  async updateFilter(
    @CurrentUser() user: RequestUser,
    @Param() params: FilterParamsDto,
    @Body() body: SaveFilterDto,
  ): Promise<SavedFilterDto> {
    return this.service.updateFilter(user, params.module, params.id, body);
  }

  @Delete(':module/filters/:id')
  @ReadOnlyAction()
  @ApiOperation({
    summary: 'Arquiva um filtro salvo',
    description: 'Nenhum filtro se apaga: ele some da lista e volta por `POST :id/restore`.',
  })
  @ApiOkResponse({ type: SavedFilterDto })
  async archiveFilter(
    @CurrentUser() user: RequestUser,
    @Param() params: FilterParamsDto,
  ): Promise<SavedFilterDto> {
    return this.service.setFilterArchived(user, params.module, params.id, true);
  }

  @Post(':module/filters/:id/restore')
  @ReadOnlyAction()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desarquiva um filtro salvo' })
  @ApiOkResponse({ type: SavedFilterDto })
  async restoreFilter(
    @CurrentUser() user: RequestUser,
    @Param() params: FilterParamsDto,
  ): Promise<SavedFilterDto> {
    return this.service.setFilterArchived(user, params.module, params.id, false);
  }

  @Post(':module/data')
  @ReadOnlyAction()
  @SkipHistory()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Os números de um bloco',
    description:
      'POST porque a pergunta tem janela, filtros do painel e faixas — mas só lê. A fonte precisa ser do módulo do endereço.',
  })
  @ApiOkResponse({ type: WidgetDataDto })
  @ApiUnprocessableEntityResponse({ description: 'A fonte é de outro módulo, ou o filtro não vale.' })
  async data(
    @CurrentUser() user: RequestUser,
    @Param() params: ModuleParamsDto,
    @Body() body: WidgetQueryDto,
  ): Promise<WidgetDataDto> {
    return this.service.data(user, params.module, body);
  }

  @Get(':module/:scope')
  @ApiOperation({
    summary: 'O painel de um módulo, num contexto',
    description:
      'Equipe: todos do módulo veem. Gestor: só gestor e administrador. Pessoal: o de quem pede. Enquanto ninguém salvou, vem o painel padrão do módulo.',
  })
  @ApiOkResponse({ type: BoardDto })
  @ApiForbiddenResponse({ description: 'Sem acesso ao módulo, ou o painel do Gestor.' })
  async board(@CurrentUser() user: RequestUser, @Param() params: BoardParamsDto): Promise<BoardDto> {
    return this.service.board(user, params.module, params.scope);
  }

  @Put(':module/:scope')
  @ReadOnlyAction()
  @ApiOperation({
    summary: 'Salva o painel de um módulo, num contexto',
    description:
      'Equipe: o administrador do módulo. Gestor: gestor e administrador. Pessoal: a própria pessoa. A cota de pontos vale aqui também.',
  })
  @ApiOkResponse({ type: BoardDto })
  @ApiForbiddenResponse({ description: 'Quem pede não monta este painel.' })
  @ApiUnprocessableEntityResponse({ description: 'Passa da cota, ou usa fonte de outro módulo.' })
  async saveBoard(
    @CurrentUser() user: RequestUser,
    @Param() params: BoardParamsDto,
    @Body() body: SaveBoardDto,
  ): Promise<BoardDto> {
    return this.service.saveBoard(user, params.module, params.scope, body);
  }
}
