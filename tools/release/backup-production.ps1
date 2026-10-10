# SENSITIVE LOCAL RECOVERY ARTIFACT — NEVER COMMIT
# Read-only dump. No schema, account, role, or password changes.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$DatabaseHost,
  [int]$Port = 5432,
  [string]$DatabaseUser = 'postgres',
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\17\bin',
  [switch]$UseDocker,
  [string]$StorageConfigPath,
  [Parameter(Mandatory=$true)][ValidatePattern('^[0-9a-fA-F]{40}$')][string]$ApplicationReleaseSha,
  [Parameter(Mandatory=$true)][string]$DeploymentInventoryPath,
  [string]$ArtifactRoot = "$env:LOCALAPPDATA\CyberSentinels\production-backups"
)
$ErrorActionPreference = 'Stop'
if ($UseDocker) { throw 'Synchronized capture requires native PostgreSQL 17.11 tools; remove -UseDocker. Legacy unsynchronized capture is disabled.' }
$projectRef = 'kecgtsfibkypjuaxqbjx'
if ($DatabaseHost -ne "db.$projectRef.supabase.co" -and
    -not ($DatabaseHost -match '^[a-z0-9.-]+\.pooler\.supabase\.com$' -and $DatabaseUser -eq "postgres.$projectRef")) {
  throw 'Use the Production direct hostname or its dashboard-provided session pooler with the exact Production username.'
}
if ($Port -ne 5432) { throw 'Use direct or session-pooler port 5432, not the transaction pooler.' }
$dumpExe = Join-Path $PostgresBin 'pg_dump.exe'
$dockerImage = 'postgres@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'
if ($DatabaseUser -notin @('postgres', "postgres.$projectRef")) { throw 'Unexpected Production database username.' }
if ($UseDocker) {
  $version = & docker run --rm $dockerImage pg_dump --version
} else { $version = & $dumpExe --version }
if ($LASTEXITCODE -ne 0 -or $version -notmatch '17\.11(?:\s|$)') { throw 'PostgreSQL 17.11 pg_dump is required.' }
$deploymentInventory = Get-Content -LiteralPath $DeploymentInventoryPath -Raw -Encoding utf8 | ConvertFrom-Json
$inventoryFields = @($deploymentInventory.PSObject.Properties.Name)
if ($inventoryFields | Where-Object { $_ -notin @('provider','environment','deploymentId','releaseSha','capturedAt','configuration') }) { throw 'Deployment inventory contains an unsupported field; values and secrets are forbidden.' }
if ($deploymentInventory.provider -ne 'vercel' -or $deploymentInventory.environment -ne 'production' -or
  $deploymentInventory.releaseSha -ne $ApplicationReleaseSha -or
  $deploymentInventory.capturedAt -notmatch '^\d{4}-\d{2}-\d{2}T.*Z$' -or
  -not $deploymentInventory.deploymentId -or
  @($deploymentInventory.configuration).Count -gt 200) { throw 'A Production-bound sanitized deployment inventory matching the release SHA is required.' }
foreach ($entry in @($deploymentInventory.configuration)) {
  if (@($entry.PSObject.Properties.Name | Where-Object { $_ -notin @('name','configured','scope') }).Count -gt 0 -or
    $entry.name -notmatch '^[A-Z][A-Z0-9_]{0,127}$' -or
    $entry.configured -isnot [bool] -or
    ($entry.scope -and $entry.scope -notin @('public','server','shared'))) { throw 'Deployment inventory must contain only variable names, presence, and scope; never values.' }
}
$resolvedRoot = [IO.Path]::GetFullPath($ArtifactRoot)
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if ($resolvedRoot.StartsWith($repositoryRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $resolvedRoot -eq $repositoryRoot) {
  throw 'Recovery artifacts must be outside the repository.'
}
$artifactDirectory = Join-Path $resolvedRoot ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N'))
if ($artifactDirectory -match '[,"\r\n]') { throw 'Unsupported artifact path for the Docker bind mount.' }
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl -LiteralPath $artifactDirectory
$acl.SetAccessRuleProtection($true,$false)
$rule = New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $artifactDirectory -AclObject $acl
$password = Read-Host 'Existing Production database password (never pasted into chat)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$previousPassword = $env:PGPASSWORD
$previousSsl = $env:PGSSLMODE
$previousOptions = $env:PGOPTIONS
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $captureConfig = [ordered]@{
    directory=$artifactDirectory; projectRef=$projectRef; postgresBin=$PostgresBin
    applicationReleaseSha=$ApplicationReleaseSha.ToLowerInvariant(); deploymentConfigurationInventory=$deploymentInventory
    database=@{host=$DatabaseHost;port=$Port;user=$DatabaseUser;database='postgres';ssl=@{rejectUnauthorized=$true}}
  }
  if ($StorageConfigPath) { $captureConfig.storage = Get-Content -LiteralPath $StorageConfigPath -Raw -Encoding utf8 | ConvertFrom-Json }
  $captureConfigJson = $captureConfig | ConvertTo-Json -Depth 8 -Compress
  $captureConfigJson | & node (Join-Path $PSScriptRoot 'backup-recovery-point.mjs') --stdin
  $captureExit = $LASTEXITCODE
  $reportPath = Join-Path $artifactDirectory 'recovery-point.json'
  if (-not (Test-Path -LiteralPath $reportPath)) { throw 'Capture produced no evidence. No PASS.' }
  $report = Get-Content -LiteralPath $reportPath -Raw -Encoding utf8 | ConvertFrom-Json
  [ordered]@{
    classification='SENSITIVE LOCAL RECOVERY ARTIFACT - NEVER COMMIT'
    project=$projectRef; capturedAt=$report.finishedAt; pgDumpVersion=$version
    archive='production.dump'; sha256=$report.archive.sha256; bytes=$report.archive.bytes
    archiveReadable=$report.archiveReadable; isolatedRestoreValidated=$false
    supplementalSnapshotComplete=$report.supplementalSnapshotComplete
    storagePayloadsVerified=$report.storagePayloadsVerified; storagePointInTimeConsistent=$report.storagePointInTimeConsistent
    recoveryPointStatus=$report.status; recoveryPointManifest='recovery-point.json'; limitations=$report.limitations
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $artifactDirectory 'manifest.json') -Encoding utf8
  if ($captureExit -eq 2) { throw "Archive preserved at $artifactDirectory; completeness BLOCKED. See recovery-point.json. Do not discard the archive." }
  if ($captureExit -ne 0) { throw "Capture failed; restricted evidence at $artifactDirectory. No PASS." }
  Write-Output "Synchronized recovery point created at $artifactDirectory. Isolated database/application/Storage validation is still required."
} finally {
  $env:PGPASSWORD = $previousPassword
  $env:PGSSLMODE = $previousSsl
  $env:PGOPTIONS = $previousOptions
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  $password.Dispose()
}
