import { createHash } from 'node:crypto';

import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { generateAgentInstallerScript } from '@template/shared/domain/agent-installer-script.util';
import { hasModule } from '@template/shared/domain/module-access.util';
import {
  agentReleaseManifestSchema,
  type AgentBundleRequest,
  type AgentReleaseManifest,
} from '@template/shared/schemas/agent-release.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { STORAGE } from '../../../lib/storage/storage.token';
import { createZipArchive, type ZipEntry } from '../bundle/zip-archive.util';
import { AgentReleaseRepository } from '../repository/agent-release.repository';
import { ComputersService } from './computers.service';

export type AgentBundle = { fileName: string; content: Buffer };

/** O passo a passo que vai dentro do zip — quem abre o pacote no PC novo não vê esta tela. */
const README = `AZUOS AGENT — INSTALAÇÃO

1. Descompacte esta pasta inteira no computador (todos os arquivos juntos).
2. Clique com o botão direito em install-agent.ps1 e escolha "Executar com o PowerShell".
   Se o Windows bloquear, abra o PowerShell como Administrador nesta pasta e rode:
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; & ".\\install-agent.ps1"
3. Se o pacote não veio com o token, o script pede: cole o token gerado no cadastro da máquina.

O script instala o certificado, o agente e já conecta a máquina ao sistema.
`;

/**
 * O PACOTE DE INSTALAÇÃO: MSI, certificado, script do certificado e o install-agent.ps1 num
 * zip só, para quem instala não precisar baixar quatro arquivos e juntar na mesma pasta.
 *
 * O zip é montado aqui, e não no navegador, porque os arquivos moram no bucket — e o servidor
 * já fala com ele sem depender de CORS. O MSI é conferido pelo hash do manifesto antes de
 * entrar: um arquivo corrompido no bucket não chega ao PC disfarçado de instalador.
 */
@Injectable()
export class AgentBundleService {
  constructor(
    private readonly releases: AgentReleaseRepository,
    @Inject(STORAGE) private readonly storage: FileStorage,
    private readonly computers: ComputersService,
  ) {}

  async bundle(user: RequestUser, request: AgentBundleRequest): Promise<AgentBundle> {
    this.assertAccess(user);
    const manifest = await this.manifestOf(request.version);
    const computerName = await this.computerNameFor(request);
    const files = await this.releaseFiles(manifest);
    const script = generateAgentInstallerScript({
      serverUrl: request.serverUrl,
      token: request.token,
    });

    return {
      fileName: bundleFileName(manifest.version, computerName),
      content: createZipArchive([
        ...files,
        { name: 'install-agent.ps1', content: Buffer.from(script, 'utf8') },
        { name: 'LEIA-ME.txt', content: Buffer.from(README, 'utf8') },
      ]),
    };
  }

  /** Com token, o nome da máquina dele — e só se o token for mesmo da máquina pedida. */
  private async computerNameFor(request: AgentBundleRequest): Promise<string | null> {
    if (!request.token) return null;
    const identity = await this.computers.authenticateAgent(request.token);
    if (!identity.ok && identity.reason === 'blocked')
      throw new ForbiddenException('Este computador está bloqueado. Desbloqueie antes de instalar.');
    if (!identity.ok || identity.computer.id !== request.computerId)
      throw new ForbiddenException('Este token não é desta máquina. Gere um token novo na ficha dela.');

    return identity.computer.name;
  }

  private async manifestOf(version: string): Promise<AgentReleaseManifest> {
    const raw = await this.unavailableOnFailure(() => this.releases.manifestOf(version));
    const parsed = agentReleaseManifestSchema.safeParse(raw);
    if (!parsed.success || parsed.data.version !== version)
      throw new NotFoundException('Esta versão do agente não foi publicada.');

    return parsed.data;
  }

  private async releaseFiles(manifest: AgentReleaseManifest): Promise<ZipEntry[]> {
    const { version, artifacts } = manifest;
    const [msi, certificate, certificateScript] = await Promise.all([
      this.read(artifacts.msi.key),
      this.read(artifacts.certificate.key),
      this.read(`agent/releases/${version}/install-certificate.ps1`),
    ]);
    if (sha256(msi) !== artifacts.msi.sha256)
      throw new ServiceUnavailableException('O instalador desta versão está corrompido. Avise a Infraestrutura.');

    return [
      { name: `azuos-agent-${version}-x64.msi`, content: msi },
      { name: 'publisher.cer', content: certificate },
      { name: 'install-certificate.ps1', content: certificateScript },
    ];
  }

  private async read(key: string): Promise<Buffer> {
    const file = await this.unavailableOnFailure(() => this.storage.get(key));
    if (!file)
      throw new ServiceUnavailableException('Faltam arquivos desta versão do agente. Avise a Infraestrutura.');

    return file.content;
  }

  private async unavailableOnFailure<T>(read: () => Promise<T>): Promise<T> {
    try {
      return await read();
    } catch {
      throw new ServiceUnavailableException('Não consegui montar o pacote do agente. Tente novamente em instantes.');
    }
  }

  private assertAccess(user: RequestUser): void {
    if (hasModule(user, 'infra') || hasModule(user, 'sistema')) return;
    throw new ForbiddenException(
      'O download do agente é de Infraestrutura ou Sistema. Peça acesso a um desses módulos.',
    );
  }
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** O nome do zip leva a máquina quando o token vem dentro: dois pacotes baixados não se confundem. */
function bundleFileName(version: string, computerName: string | null): string {
  const slug = (computerName ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug ? `azuos-agent-${version}-${slug}.zip` : `azuos-agent-${version}-x64.zip`;
}
