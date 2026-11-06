import { agentReleaseDownloadSchema } from '@template/shared/schemas/agent-release.schema';
import { createZodDto } from '../../../lib/http/zod-dto';

export class AgentReleaseDownloadDto extends createZodDto(agentReleaseDownloadSchema) {}
