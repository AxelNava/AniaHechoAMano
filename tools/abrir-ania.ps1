<#
.SYNOPSIS
Abre las terminales de frontend, backend e IdentityServer de Ania en herdr.
.DESCRIPTION
Ejecutar desde una terminal de herdr. Crea una pestaña nueva, deja el frontend
arriba y divide la parte inferior entre backend e identity. Los comandos se
ejecutan en shells interactivos: al detenerlos con Ctrl+C, la terminal permanece.
No cierra ni reutiliza paneles existentes. Cada ejecución crea otra pestaña.
Requiere las carpetas hermanas de Ania, herdr, bun y el SDK .NET 10.
.PARAMETER SoloTerminales
Abre los tres directorios sin ejecutar los servicios; solo requiere herdr.
.EXAMPLE
pwsh -File .\tools\abrir-ania.ps1
.EXAMPLE
pwsh -File .\tools\abrir-ania.ps1 -SoloTerminales
#>
[CmdletBinding()]
param([switch]$SoloTerminales)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:HERDR_ENV -ne '1' -or [string]::IsNullOrWhiteSpace($env:HERDR_WORKSPACE_ID)) {
    throw 'Ejecuta este script desde una terminal de herdr.'
}

$comandos = if ($SoloTerminales) { @('herdr') } else { @('herdr', 'bun', 'dotnet') }
foreach ($comando in $comandos) {
    if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
        throw "No se encuentra el comando '$comando' en PATH."
    }
}

$frontend = Split-Path -Parent $PSScriptRoot
$base = Split-Path -Parent $frontend
$proyectos = @(
    @{ Nombre = 'Frontend Ania'; Carpeta = $frontend; Comando = 'bun run dev' }
    @{
        Nombre = 'Backend Ania'
        Carpeta = Join-Path $base 'AniaHechoAManoBackend'
        Comando = 'bun run dev'
    }
    @{
        Nombre = 'Identity Ania'
        Carpeta = Join-Path $base 'identityServer\AniaIdentityAdmin\AniaIdentityAdmin\src\AniaIdentityAdmin.STS.Identity'
        Comando = 'dotnet run --launch-profile AniaIdentityAdmin.AspNetIdentity'
    }
)

foreach ($proyecto in $proyectos) {
    if (-not (Test-Path -LiteralPath $proyecto.Carpeta -PathType Container)) {
        throw "No existe la carpeta de $($proyecto.Nombre): $($proyecto.Carpeta)"
    }
}

function Invoke-Herdr {
    param([string[]]$Argumentos)
    $salida = & herdr @Argumentos
    if ($LASTEXITCODE -ne 0) {
        throw "herdr falló al ejecutar '$($Argumentos[0]) $($Argumentos[1])' (código $LASTEXITCODE). No se reintentó la operación."
    }
    $respuesta = ($salida -join [Environment]::NewLine) | ConvertFrom-Json
    return $respuesta.result
}

function Confirmar-Id {
    param([string]$Id)
    if ([string]::IsNullOrWhiteSpace($Id)) {
        throw 'herdr no devolvió el identificador esperado. No se reintentó la operación.'
    }
}

$pestana = Invoke-Herdr @(
    'tab', 'create', '--workspace', $env:HERDR_WORKSPACE_ID,
    '--cwd', $frontend, '--label', 'Ania', '--no-focus'
)
$idPestana = [string]$pestana.tab.tab_id
$idFrontend = [string]$pestana.root_pane.pane_id
Confirmar-Id $idPestana
Confirmar-Id $idFrontend

$inferior = Invoke-Herdr @(
    'pane', 'split', '--pane', $idFrontend, '--direction', 'down',
    '--cwd', $proyectos[1].Carpeta, '--no-focus'
)
$idBackend = [string]$inferior.pane.pane_id
Confirmar-Id $idBackend

$derecha = Invoke-Herdr @(
    'pane', 'split', '--pane', $idBackend, '--direction', 'right',
    '--cwd', $proyectos[2].Carpeta, '--no-focus'
)
$idIdentity = [string]$derecha.pane.pane_id
Confirmar-Id $idIdentity

$paneles = @($idFrontend, $idBackend, $idIdentity)
for ($i = 0; $i -lt $proyectos.Count; $i++) {
    $null = Invoke-Herdr @('pane', 'rename', $paneles[$i], $proyectos[$i].Nombre)
}
if (-not $SoloTerminales) {
    for ($i = 0; $i -lt $proyectos.Count; $i++) {
        $null = Invoke-Herdr @('pane', 'run', $paneles[$i], $proyectos[$i].Comando)
    }
}
$null = Invoke-Herdr @('tab', 'focus', $idPestana)

if ($SoloTerminales) {
    Write-Output 'Terminales abiertas en la pestaña Ania. Los servicios no se han iniciado.'
} else {
    Write-Output 'Terminales abiertas en la pestaña Ania. Se enviaron los comandos de arranque.'
}
