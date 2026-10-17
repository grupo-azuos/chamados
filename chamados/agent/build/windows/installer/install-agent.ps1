#Requires -Version 5.1
<#
.SYNOPSIS
    Instalação e configuração completa do Azuos Agent no Windows.
.DESCRIPTION
    1. Eleva automaticamente para Administrador se executado como usuário comum.
    2. Instala o certificado público publisher.cer nas lojas Root e TrustedPublisher.
    3. Instala o pacote MSI azuos-agent-*-x64.msi silenciosamente via msiexec.
    4. Configura a URL do dashboard e a chave da máquina (token) informados ou solicitados.
    5. Cifra o token com DPAPI LocalMachine e grava em %ProgramData%\AzuosAgent\machine.json.
    6. Inicia o serviço AzuosAgent.
#>
[CmdletBinding()]
param(
    [string]$ServerUrl = '__SERVER_URL__',
    [string]$Token = '__TOKEN__',
    [string]$CertificatePath = '',
    [string]$MsiPath = '',
    [switch]$DisableAutoUpdate
)

$ErrorActionPreference = 'Stop'

# Auto-elevação para Administrador
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Solicitando permissões de Administrador..." -ForegroundColor Yellow
    $argsList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($PSBoundParameters.Count -gt 0) {
        foreach ($key in $PSBoundParameters.Keys) {
            $val = $PSBoundParameters[$key]
            if ($val -is [switch]) {
                if ($val.IsPresent) { $argsList += " -$key" }
            } else {
                $argsList += " -$key `"$val`""
            }
        }
    }
    Start-Process powershell.exe -ArgumentList $argsList -Verb RunAs
    exit
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          INSTALAÇÃO DO AZUOS AGENT NO WINDOWS           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) {
    $scriptDir = (Get-Location).Path
}

# 1. Instalação do Certificado de Assinatura
Write-Host "[1/4] Instalando certificado de assinatura..." -ForegroundColor Cyan
$certFile = $CertificatePath
if ([string]::IsNullOrWhiteSpace($certFile)) {
    $certFile = Join-Path $scriptDir 'publisher.cer'
}

if (Test-Path -LiteralPath $certFile) {
    try {
        $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)
        if ($certificate.HasPrivateKey) { throw 'O certificado público não pode conter chave privada.' }
        if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
        Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
        Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
        Write-Host "   Certificado instalado com sucesso nas lojas locais." -ForegroundColor Green
    } catch {
        Write-Warning "   Falha ao instalar certificado: $_"
    }
} else {
    Write-Warning "   Certificado '$certFile' não encontrado. Continuando..."
}

# 2. Instalação do MSI
Write-Host "[2/4] Instalando pacote MSI do agente..." -ForegroundColor Cyan
$targetMsi = $MsiPath
if ([string]::IsNullOrWhiteSpace($targetMsi)) {
    $found = Get-ChildItem -Path $scriptDir -Filter "azuos-agent-*-x64.msi" -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $targetMsi = $found.FullName
    } else {
        $anyMsi = Get-ChildItem -Path $scriptDir -Filter "*.msi" -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($anyMsi) { $targetMsi = $anyMsi.FullName }
    }
}

if ($targetMsi -and (Test-Path -LiteralPath $targetMsi)) {
    Write-Host "   Executando $(Split-Path $targetMsi -Leaf)..." -ForegroundColor Yellow
    $process = Start-Process "$env:SystemRoot\System32\msiexec.exe" `
        -ArgumentList "/i `"$targetMsi`" /qn /norestart REBOOT=ReallySuppress" `
        -Wait -PassThru
    if ($process.ExitCode -notin @(0, 3010)) {
        throw "A instalação do MSI falhou com código de saída: $($process.ExitCode)"
    }
    Write-Host "   MSI instalado com sucesso." -ForegroundColor Green
} else {
    Write-Host "   Nenhum arquivo MSI encontrado para instalar em '$scriptDir'. Verificando se já está instalado..." -ForegroundColor Yellow
}

# 3. Validação do ServerUrl
if ([string]::IsNullOrWhiteSpace($ServerUrl) -or $ServerUrl -eq '__SERVER_URL__') {
    Write-Host ""
    $ServerUrl = Read-Host "Informe a URL do dashboard (ex: https://chamados.exemplo.com)"
}
$ServerUrl = $ServerUrl.Trim().TrimEnd('/')
if (-not ($ServerUrl -match '^https?://')) {
    throw "A URL do servidor deve começar com https:// (ou http:// em ambiente local)."
}

# 4. Obtenção do Token
if ([string]::IsNullOrWhiteSpace($Token) -or $Token -eq '__TOKEN__') {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Cole a chave (token) do computador gerada no dashboard:" -ForegroundColor Yellow
    $Token = Read-Host
}
$Token = $Token.Trim()
if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "A chave do computador é obrigatória para conectar a máquina."
}

# 5. Configuração em %ProgramData%\AzuosAgent\machine.json
Write-Host "[3/4] Gravando configuração segura da máquina..." -ForegroundColor Cyan
$directory = Join-Path $env:ProgramData 'AzuosAgent'
if (Test-Path -LiteralPath $directory) {
    $item = Get-Item -LiteralPath $directory -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'A pasta do agente não pode ser um link ou junction.' }
}
New-Item -ItemType Directory -Path $directory -Force | Out-Null

foreach ($name in @('machine.json', 'machine.json.tmp', 'updates')) {
    $candidate = Join-Path $directory $name
    if ((Test-Path -LiteralPath $candidate) -and ((Get-Item -LiteralPath $candidate -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Existe um link inesperado na pasta do agente. Peça ao TI para verificar.'
    }
}

$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
foreach ($sid in @('S-1-5-18', 'S-1-5-32-544')) {
    $identity = New-Object Security.Principal.SecurityIdentifier($sid)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $directory -AclObject $acl

Add-Type -AssemblyName System.Security
$bytes = [Text.Encoding]::UTF8.GetBytes($Token)
try {
    $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
} finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
    $bytes = $null
}

$fingerprint = ""
if (Test-Path -LiteralPath $certFile) {
    try {
        $cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2($certFile)
        $sha = [Security.Cryptography.SHA256]::Create()
        $fingerprint = ([BitConverter]::ToString($sha.ComputeHash($cert.RawData))).Replace('-', '').ToLowerInvariant()
    } catch {}
}

$config = @{
    serverUrl = $ServerUrl
    tokenCipher = [Convert]::ToBase64String($cipher)
    signerSha256 = $fingerprint
    autoUpdate = -not $DisableAutoUpdate.IsPresent
}
$json = $config | ConvertTo-Json
$path = Join-Path $directory 'machine.json'
[IO.File]::WriteAllText("$path.tmp", $json, (New-Object Text.UTF8Encoding($false)))
$fileAcl = Get-Acl -LiteralPath "$path.tmp"
$fileAcl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
Set-Acl -LiteralPath "$path.tmp" -AclObject $fileAcl
Move-Item -LiteralPath "$path.tmp" -Destination $path -Force
Write-Host "   Configuração gravada com sucesso em $path." -ForegroundColor Green

# 6. Inicialização do Serviço
Write-Host "[4/4] Iniciando o serviço AzuosAgent..." -ForegroundColor Cyan
if (Get-Service -Name 'AzuosAgent' -ErrorAction SilentlyContinue) {
    Restart-Service -Name 'AzuosAgent'
    Write-Host "   Serviço AzuosAgent reiniciado e ativo." -ForegroundColor Green
} else {
    Write-Warning "   O serviço AzuosAgent ainda não foi encontrado. Verifique se o MSI foi instalado."
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "         AGENTE AZUOS CONFIGURADO COM SUCESSO!            " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "O computador agora está conectado ao servidor e enviando telemetria."
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Start-Sleep -Seconds 5
}
