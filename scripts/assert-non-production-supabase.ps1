[CmdletBinding()]
param(
    [Parameter()]
    [string] $ProjectRef,

    [Parameter()]
    [string] $StagingProjectRef
)

$productionProjectRef = 'kecgtsfibkypjuaxqbjx'
$emDash = [char] 0x2014
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$linkedProjectRefPath = Join-Path $repositoryRoot 'supabase/.temp/project-ref'
$projectRefWasProvided = $PSBoundParameters.ContainsKey('ProjectRef')

if (-not $projectRefWasProvided -and [string]::IsNullOrWhiteSpace($ProjectRef)) {
    $ProjectRef = $env:SUPABASE_PROJECT_REF
}

if (-not $projectRefWasProvided -and
    [string]::IsNullOrWhiteSpace($ProjectRef) -and
    (Test-Path -LiteralPath $linkedProjectRefPath)) {
    $ProjectRef = (Get-Content -LiteralPath $linkedProjectRefPath -Raw).Trim()
}

if ([string]::IsNullOrWhiteSpace($StagingProjectRef)) {
    $StagingProjectRef = $env:STAGING_SUPABASE_PROJECT_REF
}

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
    [Console]::Error.WriteLine('BLOCKED ' + $emDash + ' SUPABASE TARGET UNKNOWN')
    exit 3
}

$ProjectRef = $ProjectRef.Trim()

if ($ProjectRef -eq $productionProjectRef) {
    [Console]::Error.WriteLine('BLOCKED ' + $emDash + ' PRODUCTION SUPABASE TARGET DETECTED')
    exit 2
}

if ([string]::IsNullOrWhiteSpace($StagingProjectRef)) {
    [Console]::Error.WriteLine('BLOCKED ' + $emDash + ' STAGING TARGET NOT APPROVED')
    exit 4
}

$StagingProjectRef = $StagingProjectRef.Trim()

if ($StagingProjectRef -eq $productionProjectRef) {
    [Console]::Error.WriteLine('BLOCKED ' + $emDash + ' PRODUCTION SUPABASE TARGET DETECTED')
    exit 2
}

if ($ProjectRef -ne $StagingProjectRef) {
    [Console]::Error.WriteLine('BLOCKED ' + $emDash + ' STAGING TARGET NOT APPROVED')
    exit 5
}

Write-Output ('PASS ' + $emDash + " NON-PRODUCTION SUPABASE TARGET CONFIRMED: $ProjectRef")
