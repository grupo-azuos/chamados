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
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateTaskStageDto,
  MoveTaskStageDto,
  TaskStageDto,
  TaskStageListQueryDto,
  UpdateTaskStageDto,
} from '../dto/task.dto';
import { TaskStagesService } from '../service/task-stages.service';

/**
 * O controller só recebe e entrega. As situações são da área (Infraestrutura, Sistema): quem decide
 * se a pessoa lê ou mexe é o service, pelo cargo naquela área.
 */
@ApiTags('Tarefas')
@AnyModule()
@Controller('task-stages')
export class TaskStagesController {
  constructor(private readonly service: TaskStagesService) {}

  @Get()
  @ApiOperation({
    summary: 'As situações próprias das tarefas de uma área',
    description:
      'Na ordem das colunas do quadro (entre Reaberta e Finalizada). As arquivadas não vêm; `?archived=only` traz só elas.',
  })
  @ApiOkResponse({ type: [TaskStageDto] })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: TaskStageListQueryDto,
  ): Promise<TaskStageDto[]> {
    return this.service.list(user, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma situação própria',
    description: 'Entra como a última coluna, antes de Finalizada.',
  })
  @ApiCreatedResponse({ type: TaskStageDto })
  @ApiConflictResponse({ description: 'Já existe uma situação com esse nome na área.' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateTaskStageDto,
  ): Promise<TaskStageDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomeia ou troca a cor da situação' })
  @ApiOkResponse({ type: TaskStageDto })
  @ApiNotFoundResponse({ description: 'Situação não encontrada.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskStageDto,
  ): Promise<TaskStageDto> {
    return this.service.update(user, id, body);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Anda a coluna uma casa para a esquerda (-1) ou a direita (1)' })
  @ApiOkResponse({ type: [TaskStageDto] })
  async move(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MoveTaskStageDto,
  ): Promise<TaskStageDto[]> {
    return this.service.move(user, id, body);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Desarquiva a situação',
    description:
      'Volta como a última coluna própria, vazia (as tarefas dela foram para a coluna fixa ao arquivar).',
  })
  @ApiCreatedResponse({ type: TaskStageDto })
  @ApiConflictResponse({ description: 'Já existe outra situação em uso com esse nome.' })
  async restore(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskStageDto> {
    return this.service.restore(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Arquiva a situação',
    description: 'As tarefas dela voltam à coluna fixa de cada uma (Aberta ou Reaberta).',
  })
  @ApiNoContentResponse({ description: 'Arquivada.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.remove(user, id);
  }
}
