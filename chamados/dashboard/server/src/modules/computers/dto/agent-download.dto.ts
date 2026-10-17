import { createZodDto } from 'nestjs-zod';
import {
  agentDownloadQuerySchema,
  agentLtsSchema,
  agentFileLinkSchema,
} from '@template/shared/schemas/agent-release.schema';
export class AgentDownloadQueryDto extends createZodDto(agentDownloadQuerySchema) {}
export class AgentLtsDto extends createZodDto(agentLtsSchema) {}
export class AgentFileLinkDto extends createZodDto(agentFileLinkSchema) {}
