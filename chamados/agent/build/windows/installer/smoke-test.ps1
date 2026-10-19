#Requires -Version 5.1
# O runner testa instalação real, coleta sem configuração e desinstalação, sem tocar no parque.
[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$MsiPath, [string]$LegacyMsiPath, [switch]$ProvisionOnly)
$ErrorActionPreference = 'Stop'
# Parseia todos os entrypoints com o Windows PowerShell usado nas máquinas.
foreach ($script in (Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1')) {
    $parseTokens = $null
    $parseErrors = $null
    [Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$parseTokens, [ref]$parseErrors) | Out-Null
    if ($parseErrors.Count) { throw "Invalid PowerShell script $($script.Name): $parseErrors" }
}
# msiexec rejeita caminhos com separadores misturados, aceitos pelo PowerShell.
$MsiPath = [IO.Path]::GetFullPath((Get-Item -LiteralPath $MsiPath).FullName).Replace('/', '\')
if ($ProvisionOnly) {
    $token = ConvertTo-SecureString 'fixture-provisioning-token' -AsPlainText -Force
    & (Join-Path $PSScriptRoot 'configure-machine.ps1') -ServerUrl 'https://127.0.0.1:1' `
        -Token $token -CertificatePath (Join-Path (Split-Path $MsiPath) 'publisher.cer') -DisableAutoUpdate
    exit 0
}
function Invoke-Msi([string]$Operation, [string]$Package = $MsiPath, [string]$Label = 'current') {
    $log = Join-Path $env:TEMP "azuos-smoke-$Label-$($Operation.TrimStart('/')).log"
    $process = Start-Process -FilePath "$env:SystemRoot\System32\msiexec.exe" -ArgumentList @($Operation, "`"$Package`"", '/qn', '/norestart', '/L*v', "`"$log`"") -Wait -PassThru
    if ($process.ExitCode -notin @(0, 3010)) {
        Get-Content $log
        throw "Windows Installer returned $($process.ExitCode)"
    }
}
$installDirectory = Join-Path $env:ProgramFiles 'Azuos\Agent'
$desktop = Join-Path $installDirectory 'Azuos Agent.exe'
function Assert-InstalledFiles {
    foreach ($name in @('Azuos Agent.exe', 'azuos-agent-service.exe', 'configure-machine.ps1', 'install-certificate.ps1')) {
        if (-not (Test-Path -LiteralPath (Join-Path $installDirectory $name))) { throw "Installed file missing: $name" }
    }
    # O Run deve conter o caminho resolvido, nunca a referência literal do MSI.
    $run = Get-ItemPropertyValue 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' 'AzuosAgent'
    if ($run -ne "`"$desktop`" --background") { throw "Invalid startup command: $run" }
}
try {
    Invoke-Msi '/i'
    Assert-InstalledFiles
    $desktopHash = (Get-FileHash -LiteralPath $desktop -Algorithm SHA256).Hash
    # Reproduz exatamente a ausência de interface relatada e exige reparo real.
    Remove-Item -LiteralPath $desktop -Force
    Invoke-Msi '/famus' $MsiPath 'repair'
    Assert-InstalledFiles
    if ((Get-FileHash -LiteralPath $desktop -Algorithm SHA256).Hash -ne $desktopHash) { throw 'Repair restored different desktop bytes' }
    if ($LegacyMsiPath) {
        Invoke-Msi '/x'
        $LegacyMsiPath = [IO.Path]::GetFullPath((Get-Item -LiteralPath $LegacyMsiPath).FullName).Replace('/', '\')
        Invoke-Msi '/i' $LegacyMsiPath 'legacy'
        Assert-InstalledFiles
        # Arquivo PE já versionado contra MSI antigo sem File.Version.
        # O MSI novo não pode ignorar a interface antes de remover o produto antigo.
        Invoke-Msi '/i' $MsiPath 'upgrade'
        Assert-InstalledFiles
        if ((Get-FileHash -LiteralPath $desktop -Algorithm SHA256).Hash -ne $desktopHash) { throw 'Upgrade did not restore the expected desktop' }
    }
    $service = Get-Service 'AzuosAgent'
    $service.WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    $exe = Join-Path $env:ProgramFiles 'Azuos\Agent\azuos-agent-service.exe'
    if (-not (Test-Path $exe)) { throw 'Service executable was not installed' }
    $acl = Get-Acl (Join-Path $env:ProgramData 'AzuosAgent')
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne 'S-1-5-18') { throw 'Machine directory must be owned by SYSTEM' }
    if (-not $acl.AreAccessRulesProtected) { throw 'Machine directory must not inherit user permissions' }
    # Provisiona com o PowerShell 5.1 do Windows 10/11, não apenas com pwsh 7 do runner.
    & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass `
        -File $PSCommandPath -MsiPath $MsiPath -ProvisionOnly
    if ($LASTEXITCODE -ne 0) { throw 'Windows PowerShell provisioning failed' }
    $logPath = Join-Path $env:ProgramData 'AzuosAgent\service.log'
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline -and (Get-Content $logPath -Raw) -notmatch 'service: reporting configured') {
        Start-Sleep -Milliseconds 200
    }
    $serviceLog = Get-Content $logPath -Raw
    if ($serviceLog -notmatch 'service: reporting configured') { throw 'Service could not decrypt the provisioned machine identity' }
    if ($serviceLog -match 'fixture-provisioning-token') { throw 'Machine credential leaked to service log' }
} finally {
    Invoke-Msi '/x'
}
if (Get-Service 'AzuosAgent' -ErrorAction SilentlyContinue) { throw 'Service was not removed' }
if (Test-Path -LiteralPath $desktop) { throw 'Desktop executable was not removed' }
if (-not (Test-Path -LiteralPath (Join-Path $env:ProgramData 'AzuosAgent\machine.json'))) { throw 'Uninstall removed the machine identity' }
