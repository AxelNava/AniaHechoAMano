// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const frontend = resolve(fileURLToPath(new URL('..', import.meta.url)))
const base = dirname(frontend)
const backend = resolve(base, 'AniaHechoAManoBackend')
const identity = resolve(
  base,
  'identityServer/AniaIdentityAdmin/AniaIdentityAdmin/src/AniaIdentityAdmin.STS.Identity',
)
const script = resolve(frontend, 'tools/abrir-ania.ps1')
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`

function ejecutar({ solo = false, fuera = false, faltaBackend = false, fallo = '' } = {}) {
  // Simular solo la frontera con herdr; invocar el script público sin arrancar servidores.
  const codigo = `
function global:herdr {
  $argumentos = @($args | ForEach-Object { [string]$_ })
  [Console]::Out.WriteLine('__HERDR__' + (ConvertTo-Json -InputObject $argumentos -Compress))
  $global:LASTEXITCODE = 0
  $operacion = $argumentos[0] + ' ' + $argumentos[1]
  if ($operacion -eq ${quote(fallo)}) {
    $global:LASTEXITCODE = 1
    [Console]::Error.WriteLine('{"error":"fallo simulado"}')
    return
  }
  $resultado = switch ($operacion) {
    'tab create' { @{ tab = @{ tab_id = 'nueva:t1' }; root_pane = @{ pane_id = 'nueva:p1' } } }
    'pane split' {
      $id = if ($argumentos -contains 'down') { 'nueva:p2' } else { 'nueva:p3' }
      @{ pane = @{ pane_id = $id } }
    }
    default { @{} }
  }
  @{ result = $resultado } | ConvertTo-Json -Depth 5 -Compress
}
${
  faltaBackend
    ? `function global:Test-Path {
  param([string]$LiteralPath, [string]$PathType)
  if ($LiteralPath -eq ${quote(backend)}) { return $false }
  Microsoft.PowerShell.Management\\Test-Path -LiteralPath $LiteralPath -PathType $PathType
}`
    : ''
}
try { & ${quote(script)} ${solo ? '-SoloTerminales' : ''} }
catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
`
  const resultado = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', codigo], {
    cwd: frontend,
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      HERDR_ENV: fuera ? '0' : '1',
      HERDR_WORKSPACE_ID: 'existente:w1',
      HERDR_PANE_ID: 'existente:p1',
    },
  })
  if (resultado.error) throw resultado.error
  const lineas = resultado.stdout.replaceAll('\r\n', '\n').split('\n')
  return {
    codigo: resultado.status,
    stderr: resultado.stderr.replaceAll('\r\n', '\n'),
    stdout: lineas.filter((linea) => !linea.startsWith('__HERDR__')).join('\n'),
    llamadas: lineas
      .filter((linea) => linea.startsWith('__HERDR__'))
      .map((linea) => JSON.parse(linea.slice('__HERDR__'.length)) as string[]),
  }
}

const apertura = [
  ['tab', 'create', '--workspace', 'existente:w1', '--cwd', frontend, '--label', 'Ania', '--no-focus'],
  ['pane', 'split', '--pane', 'nueva:p1', '--direction', 'down', '--cwd', backend, '--no-focus'],
  ['pane', 'split', '--pane', 'nueva:p2', '--direction', 'right', '--cwd', identity, '--no-focus'],
  ['pane', 'rename', 'nueva:p1', 'Frontend Ania'],
  ['pane', 'rename', 'nueva:p2', 'Backend Ania'],
  ['pane', 'rename', 'nueva:p3', 'Identity Ania'],
]
const arranque = [
  ['pane', 'run', 'nueva:p1', 'bun run dev'],
  ['pane', 'run', 'nueva:p2', 'bun run dev'],
  ['pane', 'run', 'nueva:p3', 'dotnet run --launch-profile AniaIdentityAdmin.AspNetIdentity'],
]
const enfoque = ['tab', 'focus', 'nueva:t1']

describe('lanzador de terminales de Ania en herdr', () => {
  it('abre los tres directorios, reproduce la distribución y envía los comandos solo a paneles nuevos', () => {
    const resultado = ejecutar()
    expect(resultado.codigo).toBe(0)
    expect(resultado.stderr).toBe('')
    expect(resultado.stdout).toBe(
      'Terminales abiertas en la pestaña Ania. Se enviaron los comandos de arranque.\n',
    )
    expect(resultado.llamadas).toEqual([...apertura, ...arranque, enfoque])
  })

  it('permite abrir las mismas terminales sin iniciar servicios', () => {
    const resultado = ejecutar({ solo: true })
    expect(resultado.codigo).toBe(0)
    expect(resultado.stderr).toBe('')
    expect(resultado.stdout).toBe(
      'Terminales abiertas en la pestaña Ania. Los servicios no se han iniciado.\n',
    )
    expect(resultado.llamadas).toEqual([...apertura, enfoque])
  })

  it('rechaza ejecuciones fuera de herdr sin crear paneles ni enviar comandos', () => {
    const resultado = ejecutar({ fuera: true })
    expect(resultado.codigo).toBe(1)
    expect(resultado.stdout).toBe('')
    expect(resultado.stderr).toBe('Ejecuta este script desde una terminal de herdr.\n')
    expect(resultado.llamadas).toEqual([])
  })

  it('valida las carpetas antes de crear cualquier terminal', () => {
    const resultado = ejecutar({ faltaBackend: true })
    expect(resultado.codigo).toBe(1)
    expect(resultado.stdout).toBe('')
    expect(resultado.stderr).toBe(`No existe la carpeta de Backend Ania: ${backend}\n`)
    expect(resultado.llamadas).toEqual([])
  })

  it('se detiene ante un fallo de herdr sin reintentar ni arrancar servicios', () => {
    const resultado = ejecutar({ fallo: 'pane split' })
    expect(resultado.codigo).toBe(1)
    expect(resultado.stdout).toBe('')
    expect(resultado.stderr).toBe(
      '{"error":"fallo simulado"}\n' +
        "herdr falló al ejecutar 'pane split' (código 1). No se reintentó la operación.\n",
    )
    expect(resultado.llamadas).toEqual(apertura.slice(0, 2))
  })
})
