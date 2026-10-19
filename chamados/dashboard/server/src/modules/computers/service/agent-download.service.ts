import {
  ConflictException,
  ForbiddenException,
  Inject,
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
  type AgentReleaseItem,
} from '@template/shared/schemas/agent-release.schema';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { DOWNLOAD_URL_TTL_SECONDS, type FileStorage } from '../../../lib/storage/file-storage.type';
import { STORAGE } from '../../../lib/storage/storage.token';
import { AgentReleaseRepository } from '../repository/agent-release.repository';

const LISTED_RELEASES = 30;

@Injectable()
export class AgentDownloadService {
  constructor(
    private readonly repository: AgentReleaseRepository,
    @Inject(STORAGE) private readonly storage: FileStorage,
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
    return this.linkTo(manifest, kind);
  }

  async releases(user: RequestUser): Promise<AgentReleaseItem[]> {
    this.assertAccess(user);
    const [versions, lts] = await Promise.all([
      this.unavailableOnFailure(() => this.repository.listVersions()),
      this.readManifest(),
    ]);
    const newest = [...versions].sort(compareVersionsDesc).slice(0, LISTED_RELEASES);
    const manifests = await Promise.all(newest.map((version) => this.manifestOf(version)));

    return manifests.flatMap((manifest) =>
      manifest
        ? [
            {
              version: manifest.version,
              publishedAt: manifest.publishedAt,
              sizeBytes: manifest.artifacts.msi.sizeBytes,
              isLts: manifest.version === lts?.version,
            },
          ]
        : [],
    );
  }

  async downloadVersion(
    user: RequestUser,
    kind: AgentDownloadKind,
    version: string,
  ): Promise<AgentFileLink> {
    this.assertAccess(user);
    const manifest = await this.manifestOf(version);
    if (!manifest) throw new NotFoundException('Esta versão do agente não foi publicada.');
    return this.linkTo(manifest, kind);
  }

  private async linkTo(
    manifest: AgentReleaseManifest,
    kind: AgentDownloadKind,
  ): Promise<AgentFileLink> {
    const { version } = manifest;
    const files = {
      msi: { key: manifest.artifacts.msi.key, name: `azuos-agent-${version}-x64.msi` },
      certificate: { key: manifest.artifacts.certificate.key, name: 'publisher.cer' },
      certificateScript: {
        key: `agent/releases/${version}/install-certificate.ps1`,
        name: 'install-certificate.ps1',
      },
    };
    const file = files[kind];
    const url = await this.storage.downloadUrl(file.key, DOWNLOAD_URL_TTL_SECONDS, file.name);
    return { version, url };
  }

  private async manifestOf(version: string): Promise<AgentReleaseManifest | null> {
    const raw = await this.unavailableOnFailure(() => this.repository.manifestOf(version));
    const parsed = agentReleaseManifestSchema.safeParse(raw);
    return parsed.success && parsed.data.version === version ? parsed.data : null;
  }

  private async unavailableOnFailure<T>(read: () => Promise<T>): Promise<T> {
    try {
      return await read();
    } catch {
      throw new ServiceUnavailableException(
        'Não consegui consultar o agente. Tente novamente em instantes.',
      );
    }
  }

  private assertAccess(user: RequestUser): void {
    if (hasModule(user, 'infra') || hasModule(user, 'sistema')) return;
    throw new ForbiddenException(
      'O download do agente é de Infraestrutura ou Sistema. Peça acesso a um desses módulos.',
    );
  }

  private async readManifest(): Promise<AgentReleaseManifest | null> {
    try {
      const raw = await this.repository.latest();
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

function compareVersionsDesc(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (b[index] ?? 0) - (a[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
