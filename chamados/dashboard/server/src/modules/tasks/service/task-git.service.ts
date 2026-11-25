import { Injectable, Optional } from '@nestjs/common';
import { isTaskBranch } from '@template/shared/domain/task-branch.util';
import { type TaskGit } from '@template/shared/schemas/task-git.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { SoftwareGitRepository } from '../../software-projects/repository/software-git.repository';
import { TasksRepository } from '../repository/tasks.repository';
import { TasksService } from './tasks.service';

const NO_GIT: TaskGit = { project: null, commits: [], branches: [] };

/**
 * O GIT DA TAREFA — o git graph do sistema do chamado dela, com as branches desta tarefa marcadas.
 * Quem pode ler a tarefa pode ler isto (a regra é a do `TasksService.get`).
 */
@Injectable()
export class TaskGitService {
  constructor(
    private readonly tasks: TasksService,
    private readonly repository: TasksRepository,
    @Optional() private readonly gitRepository?: SoftwareGitRepository,
  ) {}

  async of(user: RequestUser, id: number): Promise<TaskGit> {
    const task = await this.tasks.get(user, id);
    if (!task.ticketId || !this.gitRepository) return NO_GIT;
    const project = await this.repository.projectOfTicket(task.ticketId);
    if (!project) return NO_GIT;
    const graph = await this.gitRepository.graphOf([project.id]);
    const refs = { taskId: task.id, ticketId: task.ticketId, issueNumber: project.issueNumber };

    return {
      project: { id: project.id, name: project.name, repositoryUrl: project.repositoryUrl },
      commits: graph.commits.map((commit) => ({
        sha: commit.sha,
        parents: commit.parents,
        message: commit.message,
        authorLogin: commit.authorLogin,
        authorName: commit.authorName,
        committedAt: commit.committedAt.toISOString(),
      })),
      branches: graph.branches.map((branch) => ({
        name: branch.name,
        headSha: branch.headSha,
        firstSeenAt: branch.firstSeenAt.toISOString(),
        lastPushAt: branch.lastPushAt?.toISOString() ?? null,
        isOfTask: isTaskBranch(branch.name, refs),
      })),
    };
  }
}
