import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  AddTaskLinksDto,
  CreateTaskDto,
  SaveTaskStepsDto,
  SetTaskStageDto,
  SetTaskStatusDto,
  SetTaskStepDoneDto,
  TaskDto,
  TaskHistoryEntryDto,
  TaskListQueryDto,
  TaskPageDto,
  UpdateTaskDto,
} from '../dto/task.dto';
import { TasksService } from '../service/tasks.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * `@AnyModule()` porque a tarefa é da área DELA (Infraestrutura hoje, Sistema depois): quem
 * decide se a pessoa lê ou mexe é o service, pelo cargo naquela área.
 */
@ApiTags('Tarefas')
@AnyModule()
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as tarefas de uma área',
    description:
      'Abertas antes de finalizadas, e o prazo mais perto primeiro. `from`/`to` recortam o que toca o intervalo (calendário e timeline). `alerts` traz quantas estão atrasadas e quantas vencem na semana, no mesmo recorte.',
  })
  @ApiOkResponse({ type: TaskPageDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: TaskListQueryDto,
  ): Promise<TaskPageDto> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Uma tarefa, com etapas, vínculos e participantes' })
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskDto> {
    return this.service.get(user, id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'A linha do tempo da tarefa',
    description:
      'O que o Histórico gravou sobre a tarefa — quem mudou o quê e quando —, da mais nova para a mais velha.',
  })
  @ApiOkResponse({ type: [TaskHistoryEntryDto] })
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  async history(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskHistoryEntryDto[]> {
    return this.service.history(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra uma tarefa à mão',
    description:
      'Pode vir com etapas, vínculos (chamados, computadores, peças, itens) e participantes. Pessoa e vínculo só entram se existirem.',
  })
  @ApiCreatedResponse({ type: TaskDto })
  @ApiUnprocessableEntityResponse({ description: 'Pessoa ou vínculo que não existe.' })
  async create(@CurrentUser() user: RequestUser, @Body() body: CreateTaskDto): Promise<TaskDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Altera a tarefa (só o que vier no corpo)' })
  @ApiOkResponse({ type: TaskDto })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.service.update(user, id, body);
  }

  @Post(':id/status')
  @ApiOperation({
    summary: 'Finaliza ou reabre a tarefa',
    description: 'A tarefa de um chamado não se move por aqui: ela acompanha o chamado.',
  })
  @ApiOkResponse({ type: TaskDto })
  async setStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetTaskStatusDto,
  ): Promise<TaskDto> {
    return this.service.setStatus(user, id, body);
  }

  @Put(':id/stage')
  @ApiOperation({
    summary: 'Põe a tarefa numa situação própria da área',
    description:
      '`stageId` de uma situação própria ("Aguardando peça"), ou `null` para voltar à coluna fixa (Aberta ou Reaberta). A finalizada que vai para uma própria é reaberta.',
  })
  @ApiOkResponse({ type: TaskDto })
  @ApiUnprocessableEntityResponse({
    description: 'Situação de outra área, arquivada, ou tarefa de chamado finalizada.',
  })
  async setStage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetTaskStageDto,
  ): Promise<TaskDto> {
    return this.service.setStage(user, id, body.stageId);
  }

  @Put(':id/steps')
  @ApiOperation({ summary: 'Regrava o checklist, mantendo as etapas que já existem' })
  @ApiOkResponse({ type: TaskDto })
  async saveSteps(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveTaskStepsDto,
  ): Promise<TaskDto> {
    return this.service.saveSteps(user, id, body);
  }

  @Patch(':id/steps/:stepId')
  @ApiOperation({ summary: 'Marca ou desmarca uma etapa (a última finaliza a tarefa)' })
  @ApiOkResponse({ type: TaskDto })
  async setStepDone(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() body: SetTaskStepDoneDto,
  ): Promise<TaskDto> {
    return this.service.setStepDone(user, id, stepId, body.done);
  }

  @Post(':id/links')
  @ApiOperation({ summary: 'Vincula a tarefa a chamados, computadores, peças ou itens' })
  @ApiOkResponse({ type: TaskDto })
  async addLinks(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddTaskLinksDto,
  ): Promise<TaskDto> {
    return this.service.addLinks(user, id, body);
  }

  @Delete(':id/links/:linkId')
  @ApiOperation({ summary: 'Tira um vínculo da tarefa' })
  @ApiOkResponse({ type: TaskDto })
  async removeLink(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('linkId', ParseIntPipe) linkId: number,
  ): Promise<TaskDto> {
    return this.service.removeLink(user, id, linkId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Arquiva a tarefa',
    description: 'Excluir ARQUIVA: sai de "Em uso" e volta por `POST :id/restore`.',
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.remove(user, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Desarquiva a tarefa' })
  @ApiOkResponse({ type: TaskDto })
  async restore(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskDto> {
    return this.service.restore(user, id);
  }
}
