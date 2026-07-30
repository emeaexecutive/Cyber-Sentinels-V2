[CmdletBinding()]
param()

$guard = Join-Path $PSScriptRoot 'assert-safe-supabase-command.ps1'
$failures = [System.Collections.Generic.List[string]]::new()

function Invoke-GuardCase {
    param(
        [string] $Name,
        [string[]] $Arguments,
        [int] $ExpectedExit,
        [string] $ExpectedCode,
        [hashtable] $Environment = @{}
    )

    $argumentLiteral = ($Arguments | ForEach-Object {
        "'" + $_.Replace("'", "''") + "'"
    }) -join ','
    $environmentScript = ($Environment.GetEnumerator() | ForEach-Object {
        '$env:' + $_.Key + "='" + ([string]$_.Value).Replace("'", "''") + "'"
    }) -join ';'
    $environmentPrefix = if ([string]::IsNullOrWhiteSpace($environmentScript)) {
        ''
    } else {
        "$environmentScript;"
    }
    $script = "$environmentPrefix& '$guard' -CommandArgs @($argumentLiteral)"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    $output = & powershell -NoProfile -EncodedCommand $encoded 2>&1
    $exitCode = $LASTEXITCODE
    $safeOutput = ($output | Out-String).Trim()

    $codeMatched = [string]::IsNullOrWhiteSpace($ExpectedCode) -or
        $safeOutput -like "*$ExpectedCode*"
    $argumentLeaked = ($Arguments | Where-Object {
        $_.Length -ge 8 -and $safeOutput.Contains($_)
    }).Count -gt 0
    if ($exitCode -ne $ExpectedExit -or -not $codeMatched -or $argumentLeaked) {
        $failures.Add(
            "$Name returned an unexpected redacted result (exit=$exitCode, codeMatched=$codeMatched, argumentLeaked=$argumentLeaked)"
        )
    }
}

Invoke-GuardCase 'schema dry run' @('db', 'dump', '--dry-run', '--linked') 1 'DRY_RUN_DISCLOSURE'
Invoke-GuardCase 'debug' @('projects', 'list', '--debug') 1 'DEBUG_OUTPUT'
Invoke-GuardCase 'long password' @('db', 'dump', '--password', 'synthetic-value') 1 'PASSWORD_ARGUMENT'
Invoke-GuardCase 'short password' @('db', 'dump', '-p', 'synthetic-value') 1 'PASSWORD_ARGUMENT'
Invoke-GuardCase 'credential URL' @('db', 'dump', '--db-url', 'postgresql://user:synthetic@example.invalid/db') 1 'CREDENTIAL_URL'
Invoke-GuardCase 'environment secret' @('projects', 'list', 'synthetic-environment-secret') 1 'SECRET_VALUE' @{
    SUPABASE_ACCESS_TOKEN = 'synthetic-environment-secret'
}
Invoke-GuardCase 'Production mutation' @('db', 'push', '--project-ref', 'kecgtsfibkypjuaxqbjx') 1 ''
Invoke-GuardCase 'safe read' @('projects', 'list') 0 'PASS'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { [Console]::Error.WriteLine($_) }
    exit 1
}

Write-Output 'PASS - safe Supabase command guard blocks unsafe invocations with redacted output'
