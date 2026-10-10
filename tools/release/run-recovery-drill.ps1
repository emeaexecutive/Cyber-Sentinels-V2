[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$EvidenceDirectory,[string]$StoragePayloadDirectory)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$evidence = (Resolve-Path -LiteralPath $EvidenceDirectory).Path
if ($evidence -eq $repository -or $evidence.StartsWith($repository + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Restricted evidence must be outside Git.' }
# One frozen application build directory is shared by drills. Prevent overlapping dev servers.
$mutex = New-Object Threading.Mutex($false, 'Local\CyberSentinelsIsolatedRecoveryDrill')
$acquired = $false
try {
  $acquired = $mutex.WaitOne(0)
  if (-not $acquired) { Write-Error 'Recovery drill BLOCKED: another local drill holds the lock.'; exit 2 }
  Push-Location -LiteralPath $repository
  try {
    $drillArgs = @((Join-Path $PSScriptRoot 'recovery-drill.mjs'),$evidence,'--execute-local')
    if ($StoragePayloadDirectory) { $drillArgs += (Resolve-Path -LiteralPath $StoragePayloadDirectory).Path }
    & node @drillArgs
    $drillExit = $LASTEXITCODE
  }
  finally { Pop-Location }
  # 0 PASS, 2 BLOCKED (including unavailable original Storage bytes), 1 FAIL.
  # Schedulers must retain and alert on 1 and 2; neither means a complete recovery PASS.
  exit $drillExit
} finally {
  if ($acquired) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
