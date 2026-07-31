[CmdletBinding()]
param()

$guard = Join-Path $PSScriptRoot 'assert-non-production-supabase.ps1'
$production = 'kecgtsfibkypjuaxqbjx'
$staging = 'synthetic-approved-staging'
$failures = [System.Collections.Generic.List[string]]::new()

function Invoke-GuardCase {
    param(
        [string] $Name,
        [string[]] $Arguments,
        [int] $ExpectedExit,
        [string] $ExpectedText
    )

    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $guard @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()

    if ($exitCode -ne $ExpectedExit -or $text -notlike "*$ExpectedText*") {
        $failures.Add(
            "$Name expected exit $ExpectedExit and '$ExpectedText'; got exit $exitCode and '$text'"
        )
    }
}

Invoke-GuardCase -Name 'unknown target' -Arguments @(
    '-ProjectRef', ' '
) -ExpectedExit 3 -ExpectedText 'SUPABASE TARGET UNKNOWN'

Invoke-GuardCase -Name 'production target' -Arguments @(
    '-ProjectRef', $production,
    '-StagingProjectRef', $staging
) -ExpectedExit 2 -ExpectedText 'PRODUCTION SUPABASE TARGET DETECTED'

Invoke-GuardCase -Name 'unapproved staging target' -Arguments @(
    '-ProjectRef', 'other-staging',
    '-StagingProjectRef', $staging
) -ExpectedExit 5 -ExpectedText 'STAGING TARGET NOT APPROVED'

Invoke-GuardCase -Name 'approved staging target' -Arguments @(
    '-ProjectRef', $staging,
    '-StagingProjectRef', $staging
) -ExpectedExit 0 -ExpectedText 'NON-PRODUCTION SUPABASE TARGET CONFIRMED'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { [Console]::Error.WriteLine($_) }
    exit 1
}

Write-Output 'PASS - non-Production Supabase guard cases'
