#Requires -Version 5.1
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ServerUrl,
    [Parameter(Mandatory = $true)]$Token,
    [string]$CertificatePath = '',
    [switch]$DisableAutoUpdate
)
$ErrorActionPreference = 'Stop'

# 1. Normalização do ServerUrl
$ServerUrl = $ServerUrl.Trim().TrimEnd('/')
if (-not ($ServerUrl -match '^https?://')) {
    throw 'Informe a origem HTTP ou HTTPS do dashboard.'
}
try {
    $uri = [System.Uri]$ServerUrl
    $ServerUrl = "$($uri.Scheme)://$($uri.Authority)"
} catch {}

# 2. Obtenção do Token em texto puro
$plainToken = ""
if ($Token -is [Security.SecureString]) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
    try {
        $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
} else {
    $plainToken = "$Token".Trim().Trim("'`"")
}
if ([string]::IsNullOrWhiteSpace($plainToken)) {
    throw 'A chave da máquina está vazia.'
}

# 3. Certificado de Assinatura
$certFile = $CertificatePath
if ([string]::IsNullOrWhiteSpace($certFile) -or -not (Test-Path -LiteralPath $certFile)) {
    $candidate = Join-Path $PSScriptRoot 'publisher.cer'
    if (Test-Path -LiteralPath $candidate) {
        $certFile = $candidate
    }
}

if ($certFile -and (Test-Path -LiteralPath $certFile)) {
    $script = Join-Path $PSScriptRoot 'install-certificate.ps1'
    if (Test-Path -LiteralPath $script) {
        & $script -CertificatePath $certFile
    }
}

$fingerprint = ""
if ($certFile -and (Test-Path -LiteralPath $certFile)) {
    try {
        $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($certFile)
        $sha = [Security.Cryptography.SHA256]::Create()
        $fingerprint = ([BitConverter]::ToString($sha.ComputeHash($certificate.RawData))).Replace('-', '').ToLowerInvariant()
    } catch {}
}

if ([string]::IsNullOrWhiteSpace($fingerprint)) {
    $serviceExe = Join-Path $PSScriptRoot 'azuos-agent-service.exe'
    if (-not (Test-Path -LiteralPath $serviceExe)) {
        $serviceExe = Join-Path $env:ProgramFiles 'Azuos\Agent\azuos-agent-service.exe'
    }
    if (Test-Path -LiteralPath $serviceExe) {
        try {
            $sig = Get-AuthenticodeSignature -FilePath $serviceExe
            if ($sig -and $sig.SignerCertificate) {
                $sha = [Security.Cryptography.SHA256]::Create()
                $fingerprint = ([BitConverter]::ToString($sha.ComputeHash($sig.SignerCertificate.RawData))).Replace('-', '').ToLowerInvariant()
            }
        } catch {}
    }
}

# 4. Criação e permissões do diretório
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

$systemSid = New-Object Security.Principal.SecurityIdentifier('S-1-5-18')
$adminSid = New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')
$usersSid = New-Object Security.Principal.SecurityIdentifier('S-1-5-32-545')

$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
try {
    $acl.SetOwner($adminSid)
} catch {}
foreach ($sid in @($systemSid, $adminSid)) {
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
$usersRule = New-Object Security.AccessControl.FileSystemAccessRule($usersSid, 'ReadAndExecute', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($usersRule)
try {
    Set-Acl -LiteralPath $directory -AclObject $acl
} catch {
    Write-Warning "Aviso ao definir permissões do diretório: $_"
}

# 5. Cifra DPAPI LocalMachine
Add-Type -AssemblyName System.Security
$bytes = [Text.Encoding]::UTF8.GetBytes($plainToken)
try {
    $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
} finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
    $bytes = $null
    $plainToken = $null
}

$effectiveAutoUpdate = (-not $DisableAutoUpdate.IsPresent) -and (-not [string]::IsNullOrWhiteSpace($fingerprint))
$config = @{
    serverUrl = $ServerUrl
    tokenCipher = [Convert]::ToBase64String($cipher)
    signerSha256 = $fingerprint
    autoUpdate = $effectiveAutoUpdate
}
$json = $config | ConvertTo-Json
$path = Join-Path $directory 'machine.json'
[IO.File]::WriteAllText("$path.tmp", $json, (New-Object Text.UTF8Encoding($false)))
$fileAcl = Get-Acl -LiteralPath "$path.tmp"
try {
    $fileAcl.SetOwner($adminSid)
    Set-Acl -LiteralPath "$path.tmp" -AclObject $fileAcl
} catch {
    Write-Warning "Aviso ao definir dono do arquivo: $_"
}
Move-Item -LiteralPath "$path.tmp" -Destination $path -Force
Restart-Service -Name 'AzuosAgent'
Write-Host 'Agente configurado. A coleta e a atualização funcionam mesmo antes do login.'
