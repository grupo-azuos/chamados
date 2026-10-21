import { createZodDto } from 'nestjs-zod';
import {
  agentBundleRequestSchema,
  agentDownloadQuerySchema,
  agentLtsSchema,
  agentFileLinkSchema,
  agentReleaseItemSchema,
} from '@template/shared/schemas/agent-release.schema';
export class AgentDownloadQueryDto extends createZodDto(agentDownloadQuerySchema) {}
export class AgentLtsDto extends createZodDto(agentLtsSchema) {}
export class AgentFileLinkDto extends createZodDto(agentFileLinkSchema) {}
export class AgentReleaseItemDto extends createZodDto(agentReleaseItemSchema) {}
export class AgentBundleRequestDto extends createZodDto(agentBundleRequestSchema) {}
