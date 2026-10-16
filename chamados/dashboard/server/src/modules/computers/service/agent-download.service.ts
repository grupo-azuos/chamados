import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { hasModule } from '@template/shared/domain/module-access.util';
import {
  agentReleaseManifestSchema,
  type AgentDownloadKind,
  type AgentLts,
  type AgentFileLink,
  type AgentReleaseManifest,
} from '@template/shared/schemas/agent-release.schema';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { StorageService } from '../../../lib/storage/storage.service';
import { AgentReleaseRepository } from '../repository/agent-release.repository';

@Injectable()
export class AgentDownloadService {
  constructor(
    private readonly releases: AgentReleaseRepository,
    private readonly storage: StorageService,
  ) {}

  async lts(user: RequestUser): Promise<AgentLts | null> {
    this.assertAccess(user);
    const manifest = await this.readManifest();
    if (!manifest) return null;
    return {
      version: manifest.version,
      publishedAt: manifest.publishedAt,
      sizeBytes: manifest.artifacts.msi.sizeBytes,
    };
  }

  async download(
    user: RequestUser,
    kind: AgentDownloadKind,
    version: string,
  ): Promise<AgentFileLink> {
    this.assertAccess(user);
    const manifest = await this.readManifest();
    if (!manifest) throw new NotFoundException('Nenhuma versão LTS do agente foi publicada.');
    if (manifest.version !== version)
      throw new ConflictException(
        'A versão disponível mudou. Atualize a página antes de baixar os arquivos.',
      );
    const files = {
      msi: { key: manifest.artifacts.msi.key, name: `azuos-agent-${version}-x64.msi` },
      certificate: { key: manifest.artifacts.certificate.key, name: 'publisher.cer' },
      certificateScript: {
        key: `agent/releases/${version}/install-certificate.ps1`,
        name: 'install-certificate.ps1',
      },
    };
    const file = files[kind];
    const url = await this.storage.createDownloadUrl(file.key, {
      as: 'attachment',
      fileName: file.name,
    });
    return { version, url };
  }

  private assertAccess(user: RequestUser): void {
    if (hasModule(user, 'infra') || hasModule(user, 'sistema')) return;
    throw new ForbiddenException(
      'O download do agente é de Infraestrutura ou Sistema. Peça acesso a um desses módulos.',
    );
  }

  private async readManifest(): Promise<AgentReleaseManifest | null> {
    try {
      const raw = await this.releases.latest();
      if (raw === null) return null;
      const parsed = agentReleaseManifestSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch {
      // Não vaza resposta do storage nem transforma falha de acesso em ausência de versão.
      throw new ServiceUnavailableException(
        'Não consegui consultar o agente. Tente novamente em instantes.',
      );
    }
    throw new ServiceUnavailableException(
      'A versão do agente está indisponível. Tente novamente em instantes.',
    );
  }
}
