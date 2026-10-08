# SENSITIVE LOCAL RECOVERY ARTIFACT — NEVER COMMIT
# Read-only dump. No schema, account, role, or password changes.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$DatabaseHost,
  [int]$Port = 5432,
  [string]$DatabaseUser = 'postgres',
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\17\bin',
  [string]$ArtifactRoot = "$env:LOCALAPPDATA\CyberSentinels\production-backups"
)
$ErrorActionPreference = 'Stop'
$projectRef = 'kecgtsfibkypjuaxqbjx'
if ($DatabaseHost -ne "db.$projectRef.supabase.co" -and
    -not ($DatabaseHost -match '^[a-z0-9.-]+\.pooler\.supabase\.com$' -and $DatabaseUser -eq "postgres.$projectRef")) {
  throw 'Use the Production direct hostname or its dashboard-provided session pooler with the exact Production username.'
}
if ($Port -ne 5432) { throw 'Use direct or session-pooler port 5432, not the transaction pooler.' }
$dumpExe = Join-Path $PostgresBin 'pg_dump.exe'
$restoreExe = Join-Path $PostgresBin 'pg_restore.exe'
$version = & $dumpExe --version
if ($LASTEXITCODE -ne 0 -or $version -notmatch '17\.11(?:\s|$)') { throw 'PostgreSQL 17.11 pg_dump is required.' }
$resolvedRoot = [IO.Path]::GetFullPath($ArtifactRoot)
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if ($resolvedRoot.StartsWith($repositoryRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $resolvedRoot -eq $repositoryRoot) {
  throw 'Recovery artifacts must be outside the repository.'
}
$artifactDirectory = Join-Path $resolvedRoot ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl -LiteralPath $artifactDirectory
$acl.SetAccessRuleProtection($true,$false)
$rule = New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $artifactDirectory -AclObject $acl
$archive = Join-Path $artifactDirectory 'production.dump'
$password = Read-Host 'Existing Production database password (never pasted into chat)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$previousPassword = $env:PGPASSWORD
$previousSsl = $env:PGSSLMODE
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:PGSSLMODE = 'require'
  & $dumpExe --host=$DatabaseHost --port=$Port --username=$DatabaseUser --dbname=postgres --no-password --format=custom --file=$archive
  if ($LASTEXITCODE -ne 0) { throw 'Dump failed. Preserve the restricted artifact directory for diagnosis; it is not a recovery point.' }
  $listing = & $restoreExe --list $archive
  if ($LASTEXITCODE -ne 0) { throw 'Archive is unreadable.' }
  $listing | Set-Content -LiteralPath (Join-Path $artifactDirectory 'archive-list.txt') -Encoding utf8
  foreach ($required in @('TABLE DATA public ','TABLE DATA auth ','TABLE DATA supabase_migrations ','FUNCTION public ','TRIGGER public ','CONSTRAINT public ')) {
    if (-not ($listing | Select-String -SimpleMatch $required)) { throw "Archive lacks required category: $required" }
  }
  $checksum = Get-FileHash -LiteralPath $archive -Algorithm SHA256
  [ordered]@{
    classification='SENSITIVE LOCAL RECOVERY ARTIFACT — NEVER COMMIT'
    project=$projectRef; capturedAt=[DateTime]::UtcNow.ToString('o'); pgDumpVersion=$version
    archive='production.dump'; sha256=$checksum.Hash; bytes=(Get-Item -LiteralPath $archive).Length
    archiveReadable=$true; isolatedRestoreValidated=$false
    limitations=@('Storage object bytes require a separate private object backup.','Cluster roles are not included; use an isolated Supabase-compatible target with required roles and extensions.')
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $artifactDirectory 'manifest.json') -Encoding utf8
  Write-Output "Readable archive created at $artifactDirectory. Isolated restore validation is still required."
} finally {
  $env:PGPASSWORD = $previousPassword
  $env:PGSSLMODE = $previousSsl
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  $password.Dispose()
}
