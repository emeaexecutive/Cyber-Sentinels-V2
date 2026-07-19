<#
.SYNOPSIS
  Runs the resilient CS-ENG-002 Cyber Sentinels repository audit.

.DESCRIPTION
  Executes every audit stage independently, captures combined stdout/stderr,
  writes per-stage logs and a consolidated Markdown report, and selects one
  aggregate exit code only after report generation. The runner never deploys,
  applies migrations, changes external configuration, or prints secret values.

.PARAMETER RepositoryPath
  Repository root. RepoPath is accepted as an alias.

.PARAMETER PauseAtEnd
  Wait for Enter after the report is written when running interactively.

.PARAMETER NonInteractive
  Never prompt. CI=true also forces non-interactive behavior.

.PARAMETER SkipInstall
  Record dependency installation as skipped.

.PARAMETER SkipTests
  Record unit, integration and security test stages as skipped.

.PARAMETER SkipBuild
  Record the production build stage as skipped.
#>
[CmdletBinding()]
param(
  [Alias('RepoPath')]
  [string]$RepositoryPath,
  [switch]$PauseAtEnd,
  [switch]$NonInteractive,
  [switch]$SkipInstall,
  [switch]$SkipTests,
  [switch]$SkipBuild,
  [switch]$SkipQualityChecks,
  [switch]$InstallDependencies,
  [switch]$Strict,
  [ValidateRange(1, 100000)]
  [int]$MaxFiles = 500
)

$ErrorActionPreference = 'Stop'
$startedAt = Get-Date
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$requestedPath = if ([string]::IsNullOrWhiteSpace($RepositoryPath)) { Split-Path -Parent $PSScriptRoot } else { $RepositoryPath }
try { $repo = [System.IO.Path]::GetFullPath($requestedPath) } catch { $repo = [System.IO.Path]::GetFullPath((Get-Location).Path) }
$reportRoot = if (Test-Path -LiteralPath $repo -PathType Container) { $repo } else { [System.IO.Path]::GetTempPath() }
$reportDirectory = Join-Path $reportRoot 'reports'
$logDirectory = Join-Path $reportDirectory "cs-eng-002-audit-$timestamp-logs"
$reportPath = Join-Path $reportDirectory "cs-eng-002-audit-$timestamp.md"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

$stageResults = New-Object System.Collections.Generic.List[object]
$script:package = $null
$script:gitBaseline = @{}
$script:routeInventory = @()
$script:providerInventory = @()
$script:migrationInventory = @()
$script:environmentInventory = @()
$script:secretFindings = @()

function New-StagePayload {
  param(
    [ValidateSet('PASS', 'FAIL', 'SKIPPED')][string]$Status,
    [string]$Summary,
    [string]$Output = ''
  )
  return @{ Status = $Status; Summary = $Summary; Output = $Output }
}

function Convert-ToSafeFileName {
  param([string]$Value)
  return (($Value.ToLowerInvariant() -replace '[^a-z0-9]+', '-') -replace '(^-|-$)', '')
}

function Invoke-AuditStage {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][bool]$Critical,
    [Parameter(Mandatory)][scriptblock]$Action
  )
  $stageStarted = Get-Date
  $payload = $null
  try {
    $payload = & $Action
    if ($null -eq $payload -or -not $payload.ContainsKey('Status')) {
      $payload = New-StagePayload -Status 'PASS' -Summary 'Stage completed.' -Output ([string]$payload)
    }
  } catch {
    $payload = New-StagePayload -Status 'FAIL' -Summary $_.Exception.Message -Output ($_ | Out-String)
  }
  $duration = [math]::Round(((Get-Date) - $stageStarted).TotalSeconds, 2)
  $safeName = Convert-ToSafeFileName $Name
  $logPath = Join-Path $logDirectory "$safeName.log"
  $logText = if ([string]::IsNullOrWhiteSpace([string]$payload.Output)) { $payload.Summary } else { [string]$payload.Output }
  $logText | Set-Content -LiteralPath $logPath -Encoding utf8
  $result = [pscustomobject]@{
    Name = $Name
    Status = [string]$payload.Status
    Critical = $Critical
    Summary = [string]$payload.Summary
    DurationSeconds = $duration
    LogPath = $logPath
    Output = $logText
  }
  $stageResults.Add($result)
  # Host output remains visible even when callers discard the returned result.
  Write-Host ("[{0}] {1}: {2}" -f $result.Status, $Name, $result.Summary)
  return $result
}

function Invoke-NativeCapture {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(Mandatory)][string[]]$CommandArgs
  )
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = @(& $FilePath @CommandArgs 2>&1)
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  return @{ ExitCode = $exitCode; Output = ($output | Out-String).TrimEnd() }
}

function Invoke-NpmCommand {
  param([string[]]$CommandArgs, [string]$Description)
  $result = Invoke-NativeCapture -FilePath 'npm.cmd' -CommandArgs $CommandArgs
  if ($result.ExitCode -eq 0) {
    return New-StagePayload -Status 'PASS' -Summary "$Description passed." -Output $result.Output
  }
  return New-StagePayload -Status 'FAIL' -Summary "$Description failed with exit code $($result.ExitCode)." -Output $result.Output
}

function Has-PackageScript {
  param([string]$Name)
  return $null -ne $script:package -and $null -ne $script:package.scripts -and $script:package.scripts.PSObject.Properties.Name -contains $Name
}

function Invoke-ExistingPackageScripts {
  param([string[]]$Names, [string]$Description)
  $available = @($Names | Where-Object { Has-PackageScript $_ })
  if ($available.Count -eq 0) {
    return New-StagePayload -Status 'FAIL' -Summary "$Description could not run because no matching package script exists."
  }
  $combined = New-Object System.Collections.Generic.List[string]
  $failed = New-Object System.Collections.Generic.List[string]
  foreach ($name in $available) {
    $result = Invoke-NativeCapture -FilePath 'npm.cmd' -CommandArgs @('run', $name)
    $combined.Add("### npm run $name`n$($result.Output)")
    if ($result.ExitCode -ne 0) { $failed.Add("$name ($($result.ExitCode))") }
  }
  if ($failed.Count -gt 0) {
    return New-StagePayload -Status 'FAIL' -Summary "$Description failed: $($failed -join ', ')." -Output ($combined -join "`n`n")
  }
  return New-StagePayload -Status 'PASS' -Summary "$Description passed: $($available -join ', ')." -Output ($combined -join "`n`n")
}

function Get-TrackedFiles {
  $result = Invoke-NativeCapture -FilePath 'git' -CommandArgs @('-c', 'core.safecrlf=false', 'ls-files')
  if ($result.ExitCode -ne 0) { return @() }
  return @($result.Output -split '\r?\n' | Where-Object { $_ })
}

Invoke-AuditStage -Name 'repository validation' -Critical $true -Action {
  if (-not (Test-Path -LiteralPath $repo -PathType Container)) { return New-StagePayload -Status 'FAIL' -Summary "Repository path does not exist: $repo" }
  Set-Location -LiteralPath $repo
  $packagePath = Join-Path $repo 'package.json'
  if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { return New-StagePayload -Status 'FAIL' -Summary 'package.json is missing.' }
  try { $script:package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json } catch { return New-StagePayload -Status 'FAIL' -Summary "package.json is invalid: $($_.Exception.Message)" }
  return New-StagePayload -Status 'PASS' -Summary "Repository and package manifest are readable at $repo."
} | Out-Null

Invoke-AuditStage -Name 'Git branch and conflict checks' -Critical $true -Action {
  if (-not (Test-Path -LiteralPath $repo -PathType Container)) { return New-StagePayload -Status 'FAIL' -Summary 'Git checks are blocked because the repository directory is unavailable.' }
  Set-Location -LiteralPath $repo
  $inside = Invoke-NativeCapture 'git' @('rev-parse', '--is-inside-work-tree')
  if ($inside.ExitCode -ne 0 -or $inside.Output.Trim() -ne 'true') { return New-StagePayload -Status 'FAIL' -Summary 'The path is not a Git worktree.' -Output $inside.Output }
  $branch = Invoke-NativeCapture 'git' @('branch', '--show-current')
  # The index is authoritative for unresolved entries. `git diff --name-only`
  # can emit worktree line-ending warnings on stderr, which must not be
  # misclassified as conflict paths when combined output is retained.
  $conflicts = Invoke-NativeCapture 'git' @('ls-files', '-u')
  $head = Invoke-NativeCapture 'git' @('rev-parse', '--short=12', 'HEAD')
  $status = Invoke-NativeCapture 'git' @('status', '--short', '--branch')
  $origin = Invoke-NativeCapture 'git' @('remote', 'get-url', 'origin')
  $script:gitBaseline = @{ Branch = $branch.Output.Trim(); Head = $head.Output.Trim(); Status = $status.Output; Origin = $origin.Output.Trim(); Conflicts = $conflicts.Output.Trim() }
  $problems = @()
  if ($branch.Output.Trim() -ne 'main') { $problems += "Expected main; found $($branch.Output.Trim())." }
  if (-not [string]::IsNullOrWhiteSpace($conflicts.Output)) { $problems += 'Unresolved merge conflicts are present.' }
  if ($problems.Count) { return New-StagePayload -Status 'FAIL' -Summary ($problems -join ' ') -Output $status.Output }
  return New-StagePayload -Status 'PASS' -Summary "Branch main has no unresolved conflicts at $($head.Output.Trim())." -Output $status.Output
} | Out-Null

Invoke-AuditStage -Name 'dependency install' -Critical $true -Action {
  if ($SkipQualityChecks -or $SkipInstall) { return New-StagePayload -Status 'SKIPPED' -Summary 'Dependency installation was skipped by caller.' }
  if ($null -eq $script:package) { return New-StagePayload -Status 'FAIL' -Summary 'Dependency installation is blocked because package.json was not loaded.' }
  $args = if (Test-Path -LiteralPath (Join-Path $repo 'package-lock.json')) { @('ci', '--no-audit', '--fund=false') } else { @('install', '--no-audit', '--fund=false') }
  return Invoke-NpmCommand -CommandArgs $args -Description 'Dependency installation'
} | Out-Null

Invoke-AuditStage -Name 'lint' -Critical $true -Action {
  if ($SkipQualityChecks) { return New-StagePayload -Status 'SKIPPED' -Summary 'Lint was skipped by caller.' }
  if (-not (Has-PackageScript 'lint')) { return New-StagePayload -Status 'FAIL' -Summary 'Package script lint is missing.' }
  return Invoke-NpmCommand -CommandArgs @('run', 'lint') -Description 'Lint'
} | Out-Null

Invoke-AuditStage -Name 'type-check' -Critical $true -Action {
  if ($SkipQualityChecks) { return New-StagePayload -Status 'SKIPPED' -Summary 'Type-check was skipped by caller.' }
  if (-not (Has-PackageScript 'typecheck')) { return New-StagePayload -Status 'FAIL' -Summary 'Package script typecheck is missing.' }
  return Invoke-NpmCommand -CommandArgs @('run', 'typecheck') -Description 'Type-check'
} | Out-Null

Invoke-AuditStage -Name 'unit tests' -Critical $true -Action {
  if ($SkipQualityChecks -or $SkipTests) { return New-StagePayload -Status 'SKIPPED' -Summary 'Unit tests were skipped by caller.' }
  if (-not (Has-PackageScript 'test')) { return New-StagePayload -Status 'FAIL' -Summary 'Package script test is missing.' }
  return Invoke-NpmCommand -CommandArgs @('test') -Description 'Default unit and repository test chain'
} | Out-Null

Invoke-AuditStage -Name 'integration tests' -Critical $true -Action {
  if ($SkipQualityChecks -or $SkipTests) { return New-StagePayload -Status 'SKIPPED' -Summary 'Integration tests were skipped by caller.' }
  return Invoke-ExistingPackageScripts -Names @('test:providers', 'test:hopae', 'test:identity-signals') -Description 'Integration test scripts'
} | Out-Null

Invoke-AuditStage -Name 'security tests' -Critical $true -Action {
  if ($SkipQualityChecks -or $SkipTests) { return New-StagePayload -Status 'SKIPPED' -Summary 'Security tests were skipped by caller.' }
  return Invoke-ExistingPackageScripts -Names @('test:provider-rls', 'test:identity-signal-rls', 'test:rls') -Description 'Security and RLS test scripts'
} | Out-Null

Invoke-AuditStage -Name 'build' -Critical $true -Action {
  if ($SkipQualityChecks -or $SkipBuild) { return New-StagePayload -Status 'SKIPPED' -Summary 'Production build was skipped by caller.' }
  if (-not (Has-PackageScript 'build')) { return New-StagePayload -Status 'FAIL' -Summary 'Package script build is missing.' }
  return Invoke-NpmCommand -CommandArgs @('run', 'build') -Description 'Production build'
} | Out-Null

Invoke-AuditStage -Name 'npm audit' -Critical $true -Action {
  if ($SkipQualityChecks) { return New-StagePayload -Status 'SKIPPED' -Summary 'npm audit was skipped by caller.' }
  return Invoke-NpmCommand -CommandArgs @('audit', '--omit=dev') -Description 'Production dependency audit'
} | Out-Null

Invoke-AuditStage -Name 'route inventory' -Critical $false -Action {
  $appPath = Join-Path $repo 'app'
  if (-not (Test-Path -LiteralPath $appPath -PathType Container)) { return New-StagePayload -Status 'FAIL' -Summary 'App Router directory is missing.' }
  $files = @(Get-ChildItem -LiteralPath $appPath -Recurse -File | Where-Object { $_.Name -match '^(page|route)\.(ts|tsx|js|jsx)$' } | Sort-Object FullName)
  $truncated = $files.Count -gt $MaxFiles
  $script:routeInventory = @($files | Select-Object -First $MaxFiles | ForEach-Object {
    $relative = $_.FullName.Substring($repo.Length).TrimStart('\') -replace '\\', '/'
    $route = ($relative -replace '^app', '' -replace '/\([^/]+\)', '' -replace '/(page|route)\.(ts|tsx|js|jsx)$', '')
    if ([string]::IsNullOrWhiteSpace($route)) { $route = '/' }
    [pscustomobject]@{ Route = $route; File = $relative; Kind = if ($relative -match '/route\.') { 'API' } else { 'Page' } }
  })
  if ($truncated) { return New-StagePayload -Status 'FAIL' -Summary "Route inventory exceeded MaxFiles ($($files.Count) > $MaxFiles)." -Output (($script:routeInventory | Format-Table | Out-String)) }
  return New-StagePayload -Status 'PASS' -Summary "Inventoried $($files.Count) page and API route modules." -Output (($script:routeInventory | Format-Table | Out-String))
} | Out-Null

Invoke-AuditStage -Name 'provider inventory' -Critical $false -Action {
  $capabilityPath = Join-Path $repo 'lib\providers\capability-truth.ts'
  $identityAdapterPath = Join-Path $repo 'lib\identity-signals\adapters.ts'
  $hopaePath = Join-Path $repo 'lib\providers\hopae-rc1-server.ts'
  $script:providerInventory = @(
    [pscustomobject]@{ Provider = 'hopae_connect'; RepositoryState = 'REGISTERED'; RuntimeState = 'BLOCKED'; Evidence = 'Signed adapter, timestamp validation, event ledger, normalized persistence and transaction reason codes exist; runtime requires direct evidence.' },
    [pscustomobject]@{ Provider = 'world_id'; RepositoryState = 'REGISTERED'; RuntimeState = 'BLOCKED'; Evidence = 'Server verification is not implemented; every result is INCONCLUSIVE and contributes zero.' },
    [pscustomobject]@{ Provider = 'email/phone/ip/network/geolocation'; RepositoryState = 'REGISTERED'; RuntimeState = 'DISABLED'; Evidence = 'Registry-only or incomplete adapters return blocked/unavailable states and contribute zero.' },
    [pscustomobject]@{ Provider = 'device_context'; RepositoryState = 'CONFIGURED only with secret'; RuntimeState = 'BLOCKED'; Evidence = 'Client-reported continuity context is never server-verified identity evidence.' }
  )
  $missing = @($capabilityPath, $identityAdapterPath, $hopaePath | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
  if ($missing.Count) { return New-StagePayload -Status 'FAIL' -Summary 'Provider truth implementation files are missing.' -Output ($missing -join "`n") }
  return New-StagePayload -Status 'PASS' -Summary 'Provider inventory preserves explicit maturity states without converting registration into verification.' -Output (($script:providerInventory | Format-Table -Wrap | Out-String))
} | Out-Null

Invoke-AuditStage -Name 'migration and RLS inventory' -Critical $true -Action {
  $migrationPath = Join-Path $repo 'supabase\migrations'
  if (-not (Test-Path -LiteralPath $migrationPath -PathType Container)) { return New-StagePayload -Status 'FAIL' -Summary 'Supabase migration directory is missing.' }
  $files = @(Get-ChildItem -LiteralPath $migrationPath -File -Filter '*.sql' | Sort-Object Name)
  $empty = @($files | Where-Object Length -eq 0)
  $duplicatePrefixes = @($files | Group-Object { if ($_.BaseName -match '^(\d{6,14})') { $Matches[1] } else { $_.BaseName } } | Where-Object Count -gt 1)
  $text = ($files | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
  $identityTables = @('identity_subjects', 'identity_verification_requests', 'identity_provider_capabilities', 'identity_provider_transactions', 'identity_signal_evidence', 'identity_confidence_results', 'identity_audit_events')
  $missingRls = @($identityTables | Where-Object { $text -notmatch "(?is)alter table public\.$([regex]::Escape($_)) enable row level security|\'$([regex]::Escape($_))\'.{0,500}enable row level security" })
  $teamPolicyMigration = Join-Path $migrationPath '20260528_explicit_supabase_api_grants.sql'
  $teamPolicyText = if (Test-Path -LiteralPath $teamPolicyMigration -PathType Leaf) { Get-Content -Raw -LiteralPath $teamPolicyMigration } else { '' }
  $laterTeamHardening = @($files | Where-Object Name -gt '20260528_explicit_supabase_api_grants.sql' | Where-Object {
    (Get-Content -Raw -LiteralPath $_.FullName) -match '(?is)(drop policy[^;]+Allow authenticated (teams|team_members)|create policy[^;]+on public\.(teams|team_members)[^;]+auth\.(uid|jwt))'
  })
  $legacyTeamPolicyBlocker = $teamPolicyText -match "'teams'" -and $teamPolicyText -match "'team_members'" -and $laterTeamHardening.Count -eq 0
  $unrestrictedPolicies = $text -match '(?is)(using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\))'
  $script:migrationInventory = @($files | ForEach-Object { [pscustomobject]@{ Name = $_.Name; Bytes = $_.Length } })
  $problems = @()
  if ($empty.Count) { $problems += "Empty migrations: $($empty.Name -join ', ')." }
  if ($duplicatePrefixes.Count) { $problems += "Duplicate migration prefixes: $($duplicatePrefixes.Name -join ', ')." }
  if ($missingRls.Count) { $problems += "Missing Identity RLS source evidence: $($missingRls -join ', ')." }
  if ($legacyTeamPolicyBlocker) { $problems += 'Authenticated-wide teams/team_members policies lack a later tenant-scoped replacement.' }
  $migrationOutput = "Unrestricted policy text present (requires contextual review): $unrestrictedPolicies`n`n$(($script:migrationInventory | Format-Table | Out-String))"
  if ($problems.Count) { return New-StagePayload -Status 'FAIL' -Summary ($problems -join ' ') -Output $migrationOutput }
  return New-StagePayload -Status 'PASS' -Summary "Inventoried $($files.Count) migrations; all Identity Signal Engine tables have source RLS evidence." -Output $migrationOutput
} | Out-Null

Invoke-AuditStage -Name 'environment-variable inventory' -Critical $false -Action {
  $tracked = Get-TrackedFiles
  if ($tracked.Count -eq 0) { return New-StagePayload -Status 'FAIL' -Summary 'Tracked files were unavailable for environment inventory.' }
  $names = New-Object System.Collections.Generic.HashSet[string]
  foreach ($relative in $tracked) {
    $full = Join-Path $repo $relative
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
    if ([System.IO.Path]::GetExtension($full) -notin @('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.json', '.sql', '.example')) { continue }
    $content = Get-Content -Raw -LiteralPath $full -ErrorAction SilentlyContinue
    foreach ($match in [regex]::Matches([string]$content, 'process\.env(?:\.([A-Z][A-Z0-9_]*)|\[[''\"]([A-Z][A-Z0-9_]*)[''\"]\])')) {
      [void]$names.Add($(if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }))
    }
  }
  $script:environmentInventory = @($names | Sort-Object | ForEach-Object { [pscustomobject]@{ Name = $_; Exposure = if ($_.StartsWith('NEXT_PUBLIC_')) { 'browser-visible' } else { 'server-only by naming' }; State = 'BLOCKED_BY_EXTERNAL_CONFIGURATION' } })
  return New-StagePayload -Status 'PASS' -Summary "Inventoried $($script:environmentInventory.Count) referenced environment-variable names without reading values." -Output (($script:environmentInventory | Format-Table | Out-String))
} | Out-Null

Invoke-AuditStage -Name 'secret scan' -Critical $true -Action {
  $tracked = Get-TrackedFiles
  if ($tracked.Count -eq 0) { return New-StagePayload -Status 'FAIL' -Summary 'Tracked files were unavailable for secret scanning.' }
  $pattern = '(sk_live_[A-Za-z0-9]{12,}|sk_test_[A-Za-z0-9]{12,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,})'
  $findings = New-Object System.Collections.Generic.List[string]
  foreach ($relative in $tracked) {
    $full = Join-Path $repo $relative
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
    try {
      foreach ($match in @(Select-String -LiteralPath $full -Pattern $pattern -AllMatches -ErrorAction Stop)) { $findings.Add("${relative}:$($match.LineNumber)") }
    } catch { continue }
  }
  $script:secretFindings = @($findings)
  if ($findings.Count) { return New-StagePayload -Status 'FAIL' -Summary "Potential tracked secret patterns require review at $($findings.Count) location(s); values are suppressed." -Output ($findings -join "`n") }
  return New-StagePayload -Status 'PASS' -Summary 'No tracked high-confidence secret patterns were detected.'
} | Out-Null

Invoke-AuditStage -Name 'report generation' -Critical $true -Action {
  $criticalFailures = @($stageResults | Where-Object { $_.Status -eq 'FAIL' -and $_.Critical }).Count
  $nonCriticalFailures = @($stageResults | Where-Object { $_.Status -eq 'FAIL' -and -not $_.Critical }).Count
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('# CS-ENG-002 Resilient Repository Audit')
  $lines.Add('')
  $lines.Add("**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')")
  $lines.Add('')
  $lines.Add("**Repository:** $repo")
  $lines.Add('')
  $lines.Add("**Branch:** $($script:gitBaseline.Branch)")
  $lines.Add('')
  $lines.Add("**Revision:** $($script:gitBaseline.Head)")
  $lines.Add('')
  $lines.Add("**Critical stage failures before report generation:** $criticalFailures")
  $lines.Add('')
  $lines.Add("**Non-critical stage failures before report generation:** $nonCriticalFailures")
  $lines.Add('')
  $lines.Add('External platform state is not inferred. Vercel branch/environment controls, Cloudflare WAF/DNSSEC/bot controls/rate limiting, Supabase deployed migrations, and Production RLS remain BLOCKED_BY_EXTERNAL_CONFIGURATION without direct evidence.')
  $lines.Add('')
  $lines.Add('## Stage results')
  $lines.Add('')
  $lines.Add('| Stage | Status | Critical | Seconds | Summary | Log |')
  $lines.Add('| --- | --- | --- | ---: | --- | --- |')
  foreach ($result in $stageResults) {
    $summary = $result.Summary -replace '\|', '\|' -replace '\r?\n', ' '
    # Windows PowerShell 5.1 targets .NET Framework, where Path.GetRelativePath
    # is unavailable. Logs always live in the timestamped directory beside the
    # report, so construct the portable relative link from known path segments.
    $relativeLog = "$(Split-Path -Leaf $logDirectory)/$(Split-Path -Leaf $result.LogPath)" -replace '\\', '/'
    $lines.Add("| $($result.Name) | $($result.Status) | $($result.Critical) | $($result.DurationSeconds) | $summary | $relativeLog |")
  }
  $lines.Add('')
  $lines.Add('## Provider truth')
  $lines.Add('')
  $lines.Add('| Provider | Repository state | Runtime state | Evidence boundary |')
  $lines.Add('| --- | --- | --- | --- |')
  foreach ($row in $script:providerInventory) { $lines.Add("| $($row.Provider) | $($row.RepositoryState) | $($row.RuntimeState) | $($row.Evidence) |") }
  $lines.Add('')
  $lines.Add('## Route inventory')
  $lines.Add('')
  $lines.Add('| Route | Kind | File |')
  $lines.Add('| --- | --- | --- |')
  foreach ($row in $script:routeInventory) { $lines.Add("| $($row.Route) | $($row.Kind) | $($row.File) |") }
  $lines.Add('')
  $lines.Add('## Environment register')
  $lines.Add('')
  $lines.Add('| Name | Exposure | External state |')
  $lines.Add('| --- | --- | --- |')
  foreach ($row in $script:environmentInventory) { $lines.Add("| $($row.Name) | $($row.Exposure) | $($row.State) |") }
  $lines.Add('')
  $lines.Add('## Secret scan')
  $lines.Add('')
  $lines.Add($(if ($script:secretFindings.Count) { "Potential locations (values suppressed): $($script:secretFindings -join ', ')" } else { 'No tracked high-confidence secret pattern was detected.' }))
  $lines.Add('')
  $lines.Add('## Execution options')
  $lines.Add('')
  $lines.Add("- PauseAtEnd: $PauseAtEnd")
  $lines.Add("- NonInteractive: $NonInteractive")
  $lines.Add("- SkipInstall: $SkipInstall")
  $lines.Add("- SkipTests: $SkipTests")
  $lines.Add("- SkipBuild: $SkipBuild")
  $lines.Add("- SkipQualityChecks: $SkipQualityChecks")
  $lines.Add('')
  $lines.Add('## Limitations')
  $lines.Add('')
  $lines.Add('- Migration and RLS inventory proves repository source only, not deployed Supabase state.')
  $lines.Add('- Environment inventory records names only and does not prove target-environment completeness.')
  $lines.Add('- Provider registration or configuration does not prove availability, transactions, signatures, or server verification.')
  $lines | Set-Content -LiteralPath $reportPath -Encoding utf8
  return New-StagePayload -Status 'PASS' -Summary "Consolidated report written to $reportPath." -Output $reportPath
} | Out-Null

$criticalFailures = @($stageResults | Where-Object { $_.Status -eq 'FAIL' -and $_.Critical }).Count
$nonCriticalFailures = @($stageResults | Where-Object { $_.Status -eq 'FAIL' -and -not $_.Critical }).Count
$finalExitCode = if ($criticalFailures -gt 0) { 2 } elseif ($nonCriticalFailures -gt 0) { 1 } else { 0 }
$reportStage = $stageResults | Where-Object Name -eq 'report generation' | Select-Object -Last 1
if ($reportStage.Status -eq 'PASS') {
  Add-Content -LiteralPath $reportPath -Encoding utf8 -Value "`n## Aggregate result`n`n- Critical failures: $criticalFailures`n- Non-critical failures: $nonCriticalFailures`n- Final exit code: **$finalExitCode**`n- Total duration seconds: $([math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2))"
}

Write-Output "CS-ENG-002 report: $reportPath"
Write-Output "Critical failures: $criticalFailures; non-critical failures: $nonCriticalFailures; final exit code: $finalExitCode"

$ciMode = $NonInteractive -or $env:CI -in @('1', 'true', 'TRUE', 'True')
if ($PauseAtEnd -and -not $ciMode) {
  [void](Read-Host 'Audit complete. Press Enter to close')
}

exit $finalExitCode
