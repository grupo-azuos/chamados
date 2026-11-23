import {
  addTaskLinksSchema,
  createTaskSchema,
  saveTaskStepsSchema,
  setTaskStatusSchema,
  setTaskStepDoneSchema,
  taskListQuerySchema,
  taskPageSchema,
  taskHistoryEntrySchema,
  taskSchema,
  updateTaskSchema,
} from '@template/shared/schemas/task.schema';
import {
  createTaskStageSchema,
  moveTaskStageSchema,
  setTaskStageSchema,
  taskStageListQuerySchema,
  taskStageSchema,
  updateTaskStageSchema,
} from '@template/shared/schemas/task-stage.schema';
import { createZodDto } from '../../../lib/http/zod-dto';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class TaskListQueryDto extends createZodDto(taskListQuerySchema) {}
export class TaskPageDto extends createZodDto(taskPageSchema) {}
export class TaskDto extends createZodDto(taskSchema) {}
export class TaskHistoryEntryDto extends createZodDto(taskHistoryEntrySchema) {}
export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class SetTaskStatusDto extends createZodDto(setTaskStatusSchema) {}
export class SaveTaskStepsDto extends createZodDto(saveTaskStepsSchema) {}
export class SetTaskStepDoneDto extends createZodDto(setTaskStepDoneSchema) {}
export class AddTaskLinksDto extends createZodDto(addTaskLinksSchema) {}
export class TaskStageDto extends createZodDto(taskStageSchema) {}
export class TaskStageListQueryDto extends createZodDto(taskStageListQuerySchema) {}
export class CreateTaskStageDto extends createZodDto(createTaskStageSchema) {}
export class UpdateTaskStageDto extends createZodDto(updateTaskStageSchema) {}
export class MoveTaskStageDto extends createZodDto(moveTaskStageSchema) {}
export class SetTaskStageDto extends createZodDto(setTaskStageSchema) {}
