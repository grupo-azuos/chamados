# Releases e atualização automática do agente

O formato distribuído é **MSI x64**, para Windows 10 1809 ou superior e Windows 11. Não depende
da Microsoft Store. O certificado é autoassinado e fixo entre releases. O TI instala e configura
uma vez com administrador; depois o serviço pode atualizar sem janela, UAC ou login de usuário.

## Tags exatas e componentes independentes

- `agent/v1.2.3`: valida e compila somente o agente, empacota o MSI, assina, publica no GitHub
  Releases e no bucket S3 privado, e faz o bump de versão em `main` e `develop`.
- `dashboard/v1.2.3`: valida e compila os workspaces do dashboard e publica a imagem Docker em
  `ghcr.io/grupo-azuos/chamados/dashboard:1.2.3` e `:latest`. O bot é um produto separado e sua
  versão não é alterada. A implantação no servidor não é acionada automaticamente: o destino
  de deploy ainda precisa ser configurado pelo administrador.

Não há canal no meio, sufixo, prerelease nem zeros à esquerda. `agent/prod/v1.2.3`, `v1.2.3` e
`agent/v01.2.3` não são releases válidas. Para MSI, major e minor vão até 255; patch até 65535.
A tag precisa apontar para um commit que pertença ao histórico de `origin/main`.

Depois de integrar esta implementação na main, crie a tag na main atualizada:

```bash
git switch main
git pull --ff-only
git tag agent/v0.2.0
git push origin agent/v0.2.0
# A versão do dashboard é independente:
git tag dashboard/v0.2.0
git push origin dashboard/v0.2.0
```

A fonte da versão é a tag. A CI aplica a versão **antes** do build. Depois da publicação cria
um commit `[chore](agent): Atualiza versão para … [skip ci]` (ou escopo `web`) nas duas branches.
O commit contém só os arquivos de versão. A tag original não é movida: aponta para o código-fonte
antes do bump, como no fluxo de referência do `acerola-reader`.

O agente atualiza `wails.json`, `src-go/version/version.go`, `svelte/package.json` e seu lockfile.
O dashboard atualiza os manifests da raiz, client, server e shared, incluindo as entradas dos
workspaces no lockfile. Não altera versões de dependências. O bump tenta push normal até três
vezes em checkouts temporários, sem force push ou rebase; nunca diminui uma versão mais recente.

As releases de cada componente são serializadas; publique uma tag por vez e aguarde o término
antes da próxima do mesmo componente (GitHub conserva só uma execução pendente por grupo).
O bump dos dois componentes também compartilha uma fila. Não reutilize uma tag para outros bytes.

## Configuração do GitHub, uma vez

Em **Settings → Secrets and variables → Actions**, configure:

| Tipo | Nome | Conteúdo |
|---|---|---|
| Secret | `AGENT_SIGNING_PFX_BASE64` | PFX autoassinado em Base64, com a chave privada |
| Secret | `AGENT_SIGNING_PASSWORD` | Senha do PFX |
| Secret | `S3_ACCESS_KEY_ID` | Credencial de publicação no bucket do projeto |
| Secret | `S3_SECRET_ACCESS_KEY` | Segredo dessa credencial |
| Secret opcional | `DEPLOY_KEY` | Chave SSH com escrita, autorizada a fazer bump em main/develop |
| Variable | `S3_ENDPOINT` | Endpoint HTTPS S3 do projeto, incluindo o caminho do provedor |
| Variable | `S3_REGION` | Região do endpoint |
| Variable | `S3_BUCKET` | Nome do bucket privado usado pelo backend |
| Variable opcional | `S3_FORCE_PATH_STYLE` | `true` por padrão; `false` para virtual-hosted style |

Sem `DEPLOY_KEY`, o bump usa `GITHUB_TOKEN` com `contents: write`. Branch protegida exige
configurar a identidade de automação autorizada na proteção. Uma chave SSH não ignora proteção
sozinha. O job falha se o push for recusado; nunca muda a proteção automaticamente.

A credencial S3 precisa ler e escrever somente no prefixo `agent/`; nunca é embutida no agente.
A configuração do bucket deve ser a mesma usada pela API. O GitHub Release herda a visibilidade
do repositório; mantenha-o privado se os instaladores também precisarem ser privados.

A publicação Docker usa `GITHUB_TOKEN` com `packages: write`. Para baixar uma imagem privada
no Coolify/servidor, configure ali a autenticação de leitura do GHCR.

### Gerar o certificado autoassinado persistente

Em um Windows confiável, rode uma única vez. Não gere outro certificado a cada tag.

```powershell
$password = Read-Host 'Senha da chave de assinatura' -AsSecureString
.\chamados\agent\build\windows\installer\new-signing-certificate.ps1 `
    -OutputDirectory "$env:USERPROFILE\azuos-signing" -Password $password
```

Guarde `azuos-agent-signing.pfx` e a senha em um cofre. Para cadastrar o PFX no GitHub sem
imprimir o segredo no terminal (com `gh` já autenticado):

```powershell
$pfx = "$env:USERPROFILE\azuos-signing\azuos-agent-signing.pfx"
[Convert]::ToBase64String([IO.File]::ReadAllBytes($pfx)) |
    gh secret set AGENT_SIGNING_PFX_BASE64 --repo grupo-azuos/chamados
# O comando abaixo pede o valor sem incluí-lo na linha de comando:
gh secret set AGENT_SIGNING_PASSWORD --repo grupo-azuos/chamados
```

Somente `publisher.cer`, que não contém a chave privada, acompanha as releases. As assinaturas
usam SHA256 e timestamp. A chave privada existe apenas nos Secrets e temporariamente no runner
que assina. CI de PR usa uma chave descartável, sem acessar a chave de release.

Antes de o certificado vencer, planeje a troca de confiança e do fingerprint nas máquinas com o
TI. Uma nova chave não será aceita silenciosamente pelo atualizador antigo. O certificado HTTPS
do servidor é outro certificado: o Windows também precisa confiar na CA da rede interna.

## Primeira instalação no Windows 10/11

Baixe da mesma release o `.msi`, `publisher.cer`, `install-certificate.ps1` e
`configure-machine.ps1`. Use PowerShell **como administrador**, na pasta dos arquivos. A primeira
importação de confiança é uma ação explícita do TI; depois as atualizações são silenciosas.

```powershell
# A exceção vale só para este processo, para executar o primeiro script antes de confiar nele.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-certificate.ps1

$installer = Start-Process "$env:SystemRoot\System32\msiexec.exe" `
    -ArgumentList '/i "azuos-agent-0.2.0-x64.msi" /qn /norestart REBOOT=ReallySuppress' `
    -Wait -PassThru
if ($installer.ExitCode -notin @(0, 3010)) { throw "Instalação falhou: $($installer.ExitCode)" }

# Copie a chave do computador cadastrado no dashboard. Não a escreva no comando ou num log.
$token = Read-Host 'Chave deste computador' -AsSecureString
.\configure-machine.ps1 -ServerUrl 'https://chamados.exemplo.com' -Token $token
```

A máquina precisa ter o runtime Microsoft Edge WebView2 para a **interface** Wails. O serviço
não usa WebView2 e funciona antes do login. A bandeja inicia no próximo login, pelo registro de
inicialização do Windows. Não é necessário reiniciar o computador para iniciar o serviço.

O script importa o certificado público nas lojas locais `Root` e `TrustedPublisher`, usadas
pela assinatura Authenticode. Faça isso somente com o certificado que o TI gerou e conferiu.
Ele grava `%ProgramData%\AzuosAgent\machine.json` com:

- origem HTTPS do dashboard, sem caminho, query ou credenciais;
- token cifrado com DPAPI LocalMachine;
- SHA256 do certificado de assinatura fixado pelo TI;
- `autoUpdate: true` (use `-DisableAutoUpdate` no provisionamento para desativar).

A pasta não herda permissões de usuários comuns: só SYSTEM e administradores leem/escrevem.
O serviço recusa links/junctions e arquivos de máquina que não pertençam a SYSTEM ou ao grupo Administradores.
DPAPI LocalMachine permite ao serviço abrir o token sem depender do usuário que configurou.
Não se copia automaticamente o cofre de uma sessão humana para SYSTEM: instalações antigas
precisam deste provisionamento inicial uma vez. Configuração e identidade são preservadas nos
upgrades e na desinstalação, para permitir recuperação; a limpeza definitiva é ação explícita do TI.

## Serviço e atualização

`AzuosAgent`, executado como LocalSystem, coleta e envia métricas pelo WebSocket já existente.
A bandeja mantém as métricas locais, mas não abre outra conexão de telemetria quando o serviço
está instalado. A tela mostra “Gerenciado pelo TI” e não oferece um segundo formulário de conexão.
A configuração de envio dessa instalação deve ser feita pelo script do TI.

Ao iniciar, e depois a cada hora, o serviço consulta `GET /api/agent/releases/latest` com o token
da máquina em `Authorization: Bearer`. A API usa a autenticação já existente dos computadores;
chave inválida/revogada recebe 401 e computador bloqueado recebe 403. Sem release, recebe 204.
O backend devolve versão, tamanho, SHA256 e uma URL temporária do MSI no bucket privado.

O atualizador:

1. Não segue redirecionamento na consulta autenticada; nunca envia o token ao storage.
2. Só considera uma versão estritamente maior, com download HTTPS de até 512 MB.
3. Baixa em arquivo temporário e confere tamanho e SHA256.
4. Confere Authenticode e o SHA256 do certificado fixado na instalação inicial.
5. Chama `msiexec /qn /norestart REBOOT=ReallySuppress` em processo separado.

O MSI para o serviço, fecha a bandeja se estiver aberta, substitui arquivos e inicia o serviço
novo. O instalador continua vivo quando o serviço antigo é parado. A bandeja volta no próximo
login; a coleta e a telemetria voltam com o serviço, sem login. Não há reinicialização forçada
do computador. Código 3010 indica que o Windows deixou alguma operação pendente de reboot.

Sem rede ou download válido, mantém a versão atual e tenta novamente após cinco minutos. Depois
de entregar um pacote ao MSI, guarda um recuo de uma hora em disco para evitar ciclo caso a
instalação falhe e reinicie a versão antiga. O Windows Installer faz rollback transacional de
falhas de instalação; isso não garante detectar automaticamente defeitos funcionais de uma
versão que instalou com sucesso. Para revertê-la, publique uma versão maior com a correção.

O dashboard passa a receber a nova versão no `hello`/snapshots existentes. Os detalhes de falhas
de update ficam nos logs locais; ainda não há uma tela de acompanhamento das instalações.

## S3 e proxy

O histórico fica em `agent/releases/<versão>/`, com MSI, CER, scripts, `SHA256SUMS` e manifest.
O ponteiro `agent/latest.json` só muda depois do upload de todos os arquivos. Reexecutar o job de
publicação com o mesmo artefato é permitido; bytes diferentes na mesma versão são recusados.
Se precisar reconstruir um instalador já publicado, crie outra versão.

O proxy/forwardAuth deve deixar passar **somente** `/agent` e `GET /api/agent/releases/latest`
para autenticação pela própria aplicação, sem exigir cookie humano ou redirecionar ao login.
Preserve o cabeçalho Authorization e mantenha HTTPS e o limite geral da API. Não abra todas as
rotas `/api/computers`. As credenciais S3 não passam pelo proxy para o agente.

O futuro botão de download do dashboard pode usar os mesmos objetos versionados e URLs assinadas;
a interface desse botão não faz parte desta mudança.

## Diagnóstico e validação

```powershell
Get-Service AzuosAgent
Get-Content "$env:ProgramData\AzuosAgent\service.log" -Tail 50
Get-Content "$env:ProgramData\AzuosAgent\updates\install.log" -Tail 100
```

O log do serviço gira no início quando ultrapassa 5 MB. Não registra token nem URL assinada.
O log verbose do Windows Installer ajuda a identificar código 1618 (outro instalador ativo),
1603 (falha de instalação) ou necessidade de reboot. A repetição respeita o recuo de uma hora.

`CI/Agent and releases` compila o aplicativo e o serviço no Windows, testa regras de tag/bump,
gera MSI no Ubuntu, assina com certificado descartável e instala/inicia/desinstala num runner
Windows limpo. Releases usam a mesma construção com o certificado persistente. Antes de liberar
para todo o parque, valide o primeiro upgrade entre duas versões em máquinas de teste Windows
10 e 11, com e sem usuário logado e com a rede indisponível no boot.
