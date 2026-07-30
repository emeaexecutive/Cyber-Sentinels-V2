[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string[]] $CommandArgs,

    [Parameter()]
    [switch] $AllowProductionMutation,

    [Parameter()]
    [string] $AuthorizationReference
)

$ErrorActionPreference = 'Stop'
$productionProjectRef = 'kecgtsfibkypjuaxqbjx'
$normalized = @($CommandArgs | ForEach-Object { [string] $_ })
$lower = $normalized | ForEach-Object { $_.ToLowerInvariant() }
$joined = ($lower -join ' ').Trim()

function Stop-UnsafeCommand {
    param([string] $Code)

    [Console]::Error.WriteLine("BLOCKED - UNSAFE SUPABASE COMMAND [$Code]")
    exit 2
}

if (($joined -match '(^|\s)db\s+dump(\s|$)') -and
    ($lower -contains '--dry-run')) {
    Stop-UnsafeCommand 'DRY_RUN_DISCLOSURE'
}

if ($lower -contains '--debug') {
    Stop-UnsafeCommand 'DEBUG_OUTPUT'
}

if (($lower -contains '--password') -or
    ($lower | Where-Object { $_ -like '--password=*' }).Count -gt 0 -or
    ($lower -contains '-p')) {
    Stop-UnsafeCommand 'PASSWORD_ARGUMENT'
}

$credentialUrlPattern = '(?i)^postgres(?:ql)?://[^/@:\s]+:[^/@\s]+@'
if (($normalized | Where-Object { $_ -match $credentialUrlPattern }).Count -gt 0) {
    Stop-UnsafeCommand 'CREDENTIAL_URL'
}

$secretVariableNames = @(
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_DB_PASSWORD',
    'PGPASSWORD',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TURNSTILE_SECRET_KEY',
    'RESEND_API_KEY'
)

foreach ($name in $secretVariableNames) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($value) -or $value.Length -lt 8) {
        continue
    }

    if (($normalized | Where-Object { $_.Contains($value) }).Count -gt 0) {
        Stop-UnsafeCommand 'SECRET_VALUE'
    }
}

$mutationPattern = '(?i)(^|\s)(db\s+(dump|pull|push|reset)|migration\s+(repair|up)|backups\s+restore|projects\s+delete|branches\s+(create|delete)|secrets\s+(set|unset)|functions\s+(deploy|delete))(\s|$)'
$productionTarget = $joined.Contains($productionProjectRef)

$linkedProjectRefPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'supabase/.temp/project-ref'
if (-not $productionTarget -and
    ($lower -contains '--linked') -and
    (Test-Path -LiteralPath $linkedProjectRefPath)) {
    $linkedRef = (Get-Content -LiteralPath $linkedProjectRefPath -Raw).Trim()
    $productionTarget = $linkedRef -eq $productionProjectRef
}

if ($productionTarget -and $joined -match $mutationPattern) {
    if (-not $AllowProductionMutation -or
        [string]::IsNullOrWhiteSpace($AuthorizationReference)) {
        Stop-UnsafeCommand 'PRODUCTION_MUTATION'
    }
}

Write-Output 'PASS - Supabase command arguments satisfy the local safety policy'
