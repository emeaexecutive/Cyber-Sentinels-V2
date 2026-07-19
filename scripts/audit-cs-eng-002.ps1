<#
.SYNOPSIS
  Runs the CS-ENG-002 Cyber Sentinels repository gap analysis.

.DESCRIPTION
  Performs an audit-only inventory from main, records routes, APIs,
  configuration, migrations/RLS, tests and workflows, and optionally executes
  existing package quality scripts. It writes a timestamped Markdown report
  under reports/ and exits 2 when a Critical condition is detected.

  Dependency installation is deliberately opt-in because it mutates
  node_modules and can require network access. The script never creates a
  branch, deploys, changes external configuration, runs migrations or prints
  secret values.

.PARAMETER RepositoryPath
  Repository root. RepoPath is accepted as an alias.

.PARAMETER InstallDependencies
  Opt in to npm ci (with a lockfile) or npm install before checks.

.PARAMETER SkipInstall
  Compatibility switch that suppresses installation even when requested.

.PARAMETER SkipQualityChecks
  Skip install, lint, type-check, tests, build and npm audit.

.PARAMETER SkipTests
  Skip only the package test script.

.PARAMETER SkipBuild
  Skip only the production build.

.PARAMETER Strict
  Promote any failed quality check or missing requested package script to a
  Critical result.

.PARAMETER MaxFiles
  Maximum page/API rows written per inventory. Truncation is Critical because
  an incomplete inventory cannot pass CS-ENG-002.
#>
[CmdletBinding()]
param(
  [Alias('RepoPath')]
  [string]$RepositoryPath,
  [switch]$SkipQualityChecks,
  [switch]$SkipInstall,
  [switch]$InstallDependencies,
  [switch]$SkipTests,
  [switch]$SkipBuild,
  [switch]$Strict,
  [ValidateRange(1, 100000)]
  [int]$MaxFiles = 500
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepositoryPath)) {
  $RepositoryPath = Split-Path -Parent $PSScriptRoot
}
$repo = [System.IO.Path]::GetFullPath($RepositoryPath)
$reportDirectory = Join-Path $repo "reports"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportDirectory "cs-eng-002-audit-$timestamp.md"

function Invoke-Git {
  param([Parameter(Mandatory)][string[]]$CommandArgs)
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & git -c core.safecrlf=false @CommandArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    $ErrorActionPreference = $previousErrorPreference
    throw "git $($CommandArgs -join ' ') failed: $($output -join [Environment]::NewLine)"
  }
  $ErrorActionPreference = $previousErrorPreference
  return ($output -join [Environment]::NewLine).Trim()
}

function Convert-AppPathToRoute {
  param(
    [Parameter(Mandatory)][string]$RelativePath,
    [Parameter(Mandatory)][string]$LeafName
  )
  $normalized = $RelativePath -replace '\\', '/'
  $withoutLeaf = $normalized -replace "/?$([regex]::Escape($LeafName))$", ""
  $withoutApp = $withoutLeaf -replace '^app', ''
  $withoutGroups = $withoutApp -replace '/\([^/]+\)', ''
  if ([string]::IsNullOrWhiteSpace($withoutGroups)) { return "/" }
  return $withoutGroups
}

function Get-RouteExpectation {
  param([Parameter(Mandatory)][string]$Route)
  $adminPrefixes = @(
    "/admin", "/back-office", "/enterprise/control-plane",
    "/enterprise/auditability", "/enterprise/readiness",
    "/enterprise/compliance", "/enterprise/identity-governance",
    "/enterprise/consortium", "/verification-queue", "/evidence-vault",
    "/decision-engine", "/trust-intelligence", "/trust-graph-engine",
    "/mission-control", "/signals", "/workforce-trust",
    "/intent-verification", "/autonomy-governance", "/execution-passports",
    "/state-verification", "/trust-events", "/trustops", "/launch-control"
  )
  $userPrefixes = @(
    "/agents", "/billing", "/clearances", "/client-portal",
    "/compliance-export", "/passport", "/passports", "/evidence-upload",
    "/enterprise/pilot-setup", "/trust-assistant", "/knowledge-base",
    "/data-rights", "/messages", "/notifications", "/pilot", "/appeals",
    "/feedback", "/hiring-shield", "/recruiter/dashboard", "/replay",
    "/dashboard", "/developers/api-keys", "/workspace", "/team-access",
    "/team-workspace", "/trust-replay", "/trust-center", "/verify/session",
    "/verify/candidate", "/verify/recruiter", "/verify/provenance",
    "/verification/receipt", "/verifier-network", "/interview/session"
  )
  foreach ($prefix in $adminPrefixes) {
    if ($Route -eq $prefix -or $Route.StartsWith("$prefix/")) { return "admin" }
  }
  foreach ($prefix in $userPrefixes) {
    if ($Route -eq $prefix -or $Route.StartsWith("$prefix/")) { return "authenticated" }
  }
  return "public"
}

function Get-ApiEvidence {
  param([Parameter(Mandatory)][string]$Content)
  $auth = if ($Content -match 'requireAdminApiAccess|checkAdminAccess') {
    "admin server check"
  } elseif ($Content -match 'auth\.getUser|getUser\(\)') {
    "server session check"
  } elseif ($Content -match 'verify.*signature|constructEvent|callback-security') {
    "signed callback/webhook"
  } else {
    "none found"
  }
  $authorization = if ($Content -match 'requireAdminApiAccess|checkAdminAccess') {
    "admin allowlist/cookie"
  } elseif ($Content -match 'owner_user_id|created_by|member_email|user\.id|user\.email') {
    "owner/member predicate"
  } else {
    "none found"
  }
  $tenant = if ($Content -match 'tenant_id|workspace_id|team_id|enterprise_id') {
    "tenant-like field used; trust derivation requires review"
  } else {
    "not evident"
  }
  $validation = if ($Content -match 'zod|safeParse|validate[A-Z]|isValid|FormData|typeof .*===|JSON\.parse') {
    "custom/schema evidence"
  } else {
    "none found"
  }
  $rateLimit = if ($Content -match 'rate.?limit|checkRate|consumeRate') { "present" } else { "none found" }
  $logging = if ($Content -match 'createAuditLog|console\.(error|warn|info)|record.*event|telemetry') { "present" } else { "none found" }
  return [pscustomobject]@{
    Auth = $auth
    Authorization = $authorization
    Tenant = $tenant
    Validation = $validation
    RateLimit = $rateLimit
    Logging = $logging
  }
}

function Invoke-QualityCheck {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string[]]$CommandArgs
  )
  $started = Get-Date
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & npm.cmd @CommandArgs 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  $duration = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
  $tail = @($output | Select-Object -Last 12) -join "`n"
  return [pscustomobject]@{
    Name = $Name
    ExitCode = $exitCode
    DurationSeconds = $duration
    Tail = $tail
  }
}

function Has-PackageScript {
  param(
    [Parameter(Mandatory)][object]$Package,
    [Parameter(Mandatory)][string]$Name
  )
  return $null -ne $Package.scripts -and
    $Package.scripts.PSObject.Properties.Name -contains $Name
}

if (-not (Test-Path -LiteralPath $repo -PathType Container)) {
  throw "Repository path does not exist: $repo"
}
Set-Location -LiteralPath $repo

if ((Invoke-Git -CommandArgs @('rev-parse', '--is-inside-work-tree')) -ne 'true') {
  throw "Not a Git worktree: $repo"
}

$branch = Invoke-Git -CommandArgs @('branch', '--show-current')
if ($branch -ne 'main') { throw "CS-ENG-002 requires main; active branch is $branch" }

$origin = Invoke-Git -CommandArgs @('remote', 'get-url', 'origin')
$head = Invoke-Git -CommandArgs @('rev-parse', '--short=12', 'HEAD')
$headSubject = Invoke-Git -CommandArgs @('log', '-1', '--format=%s')
$status = Invoke-Git -CommandArgs @('status', '--short', '--branch')
$conflicts = Invoke-Git -CommandArgs @('diff', '--name-only', '--diff-filter=U')
if ($conflicts) { throw "Unresolved merge conflicts detected: $conflicts" }
$divergence = Invoke-Git -CommandArgs @('rev-list', '--left-right', '--count', 'origin/main...main')
$tags = Invoke-Git -CommandArgs @('tag', '--list')

New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null

$pageFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'app') -Recurse -File -Filter 'page.*' |
  Where-Object { $_.Extension -in @('.ts', '.tsx', '.js', '.jsx') } |
  Sort-Object FullName)
$apiFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'app\api') -Recurse -File -Filter 'route.*' |
  Where-Object { $_.Extension -in @('.ts', '.tsx', '.js', '.jsx') } |
  Sort-Object FullName)
$componentFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'components') -Recurse -File -ErrorAction SilentlyContinue)
$libFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'lib') -Recurse -File -ErrorAction SilentlyContinue)
$testFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'tests') -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '\.(test|spec)\.(mjs|cjs|js|jsx|ts|tsx)$' })
$migrationFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'supabase\migrations') -File -Filter '*.sql' -ErrorAction SilentlyContinue | Sort-Object Name)
$workflowFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo '.github\workflows') -File -ErrorAction SilentlyContinue)
$scriptFiles = @(Get-ChildItem -LiteralPath (Join-Path $repo 'scripts') -File -ErrorAction SilentlyContinue)
$inventoryTruncations = New-Object System.Collections.Generic.List[string]
if ($pageFiles.Count -gt $MaxFiles) {
  $inventoryTruncations.Add("Page route inventory exceeded MaxFiles ($($pageFiles.Count) > $MaxFiles).")
}
if ($apiFiles.Count -gt $MaxFiles) {
  $inventoryTruncations.Add("API route inventory exceeded MaxFiles ($($apiFiles.Count) > $MaxFiles).")
}

$packagePath = Join-Path $repo 'package.json'
$package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
$lockfiles = @('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb') |
  Where-Object { Test-Path -LiteralPath (Join-Path $repo $_) }

$defaultTestFiles = New-Object System.Collections.Generic.HashSet[string]
$visitedScripts = New-Object System.Collections.Generic.HashSet[string]
$scriptQueue = New-Object System.Collections.Generic.Queue[string]
$scriptQueue.Enqueue('test')
while ($scriptQueue.Count -gt 0) {
  $scriptName = $scriptQueue.Dequeue()
  if (-not $visitedScripts.Add($scriptName)) { continue }
  $scriptValue = [string]$package.scripts.$scriptName
  if (-not $scriptValue) { continue }
  foreach ($match in [regex]::Matches($scriptValue, 'npm run ([A-Za-z0-9:_-]+)')) {
    $scriptQueue.Enqueue($match.Groups[1].Value)
  }
  foreach ($match in [regex]::Matches($scriptValue, 'tests/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|jsx|ts|tsx)')) {
    [void]$defaultTestFiles.Add(($match.Value -replace '/', '\'))
  }
}

$middlewarePath = Join-Path $repo 'middleware.ts'
$middlewareText = if (Test-Path -LiteralPath $middlewarePath) { Get-Content -Raw -LiteralPath $middlewarePath } else { '' }

$pageRows = foreach ($file in @($pageFiles | Select-Object -First $MaxFiles)) {
  $relative = $file.FullName.Substring($repo.Length).TrimStart('\')
  $route = Convert-AppPathToRoute -RelativePath $relative -LeafName $file.Name
  $expectation = Get-RouteExpectation -Route $route
  $content = Get-Content -Raw -LiteralPath $file.FullName
  $fileSession = $content -match 'auth\.getUser|getUser\(\)|requireAdminPageAccess|checkAdminAccess'
  $middlewareLiteral = $expectation -ne 'public'
  $actual = if ($fileSession) { 'server component session/role evidence' } elseif ($middlewareLiteral) { 'middleware prefix evidence' } else { 'none required/found' }
  [pscustomobject]@{
    Route = $route
    File = $relative -replace '\\', '/'
    Type = 'page'
    ExpectedAuth = $expectation
    ActualAuth = $actual
    TenantExpectation = if ($expectation -eq 'public') { 'none' } else { 'owner/workspace scope where data-backed' }
    Status = if ($expectation -eq 'public' -or $fileSession -or $middlewareLiteral) { 'PARTIALLY IMPLEMENTED' } else { 'MISSING' }
  }
}

$apiRows = foreach ($file in @($apiFiles | Select-Object -First $MaxFiles)) {
  $relative = $file.FullName.Substring($repo.Length).TrimStart('\')
  $route = Convert-AppPathToRoute -RelativePath $relative -LeafName $file.Name
  $content = Get-Content -Raw -LiteralPath $file.FullName
  $methods = @([regex]::Matches($content, 'export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
  if ($methods.Count -eq 0) { $methods = @('UNKNOWN') }
  $evidence = Get-ApiEvidence -Content $content
  [pscustomobject]@{
    Method = $methods -join ', '
    Path = $route
    File = $relative -replace '\\', '/'
    Purpose = ($route -replace '^/api/', '')
    Auth = $evidence.Auth
    Authorization = $evidence.Authorization
    Tenant = $evidence.Tenant
    Validation = $evidence.Validation
    RateLimit = $evidence.RateLimit
    Logging = $evidence.Logging
    Tests = if ((Get-ChildItem -LiteralPath (Join-Path $repo 'tests') -Recurse -File -ErrorAction SilentlyContinue | Select-String -SimpleMatch $route -Quiet)) { 'route string referenced' } else { 'none found' }
    Status = 'PARTIALLY IMPLEMENTED'
  }
}

$duplicateRoutes = @($pageRows | Group-Object Route | Where-Object Count -gt 1)
$hasPagesRouter = (Test-Path -LiteralPath (Join-Path $repo 'pages')) -or (Test-Path -LiteralPath (Join-Path $repo 'src\pages'))

$migrationGroups = $migrationFiles | Group-Object {
  if ($_.BaseName -match '^(\d{6,14})') { $Matches[1] } else { $_.BaseName }
}
$duplicateMigrationPrefixes = @($migrationGroups | Where-Object Count -gt 1)
$emptyMigrations = @($migrationFiles | Where-Object Length -eq 0)
$allMigrationText = ($migrationFiles | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
$teamPolicyMigration = Join-Path $repo 'supabase\migrations\20260528_explicit_supabase_api_grants.sql'
$teamPolicyText = if (Test-Path -LiteralPath $teamPolicyMigration) { Get-Content -Raw -LiteralPath $teamPolicyMigration } else { '' }
$laterTeamHardening = @($migrationFiles | Where-Object Name -gt '20260528_explicit_supabase_api_grants.sql' | Where-Object {
  (Get-Content -Raw -LiteralPath $_.FullName) -match '(?is)(drop policy[^;]+Allow authenticated (teams|team_members)|create policy[^;]+on public\.(teams|team_members)[^;]+auth\.(uid|jwt))'
})
$criticalTenantPolicy = $teamPolicyText -match "'teams'" -and $teamPolicyText -match "'team_members'" -and $laterTeamHardening.Count -eq 0

$trackedEnvFiles = @((Invoke-Git -CommandArgs @('ls-files', '--', '.env', '.env.*')) -split '\r?\n' | Where-Object { $_ })
$trackedFiles = @((Invoke-Git -CommandArgs @('ls-files')) -split '\r?\n' | Where-Object { $_ })
$envNames = New-Object System.Collections.Generic.HashSet[string]
foreach ($trackedFile in $trackedFiles) {
  $fullPath = Join-Path $repo $trackedFile
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { continue }
  if ([System.IO.Path]::GetExtension($fullPath) -notin @('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.json', '.sql', '.example')) { continue }
  $content = Get-Content -Raw -LiteralPath $fullPath -ErrorAction SilentlyContinue
  foreach ($match in [regex]::Matches([string]$content, 'process\.env(?:\.([A-Z][A-Z0-9_]*)|\[[''\"]([A-Z][A-Z0-9_]*)[''\"]\])')) {
    $name = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
    [void]$envNames.Add($name)
  }
}
$exampleNames = New-Object System.Collections.Generic.HashSet[string]
$envExamplePath = Join-Path $repo '.env.example'
if (Test-Path -LiteralPath $envExamplePath) {
  foreach ($line in Get-Content -LiteralPath $envExamplePath) {
    if ($line -match '^([A-Z][A-Z0-9_]*)=') { [void]$exampleNames.Add($Matches[1]) }
  }
}

$suspiciousLocations = New-Object System.Collections.Generic.List[string]
$secretPattern = '(sk_live_[A-Za-z0-9]+|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+|STRIPE_SECRET_KEY\s*=\s*[^\s#]+)'
foreach ($trackedFile in $trackedFiles) {
  $fullPath = Join-Path $repo $trackedFile
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { continue }
  try {
    $matches = Select-String -LiteralPath $fullPath -Pattern $secretPattern -AllMatches -ErrorAction Stop
    foreach ($match in $matches) { $suspiciousLocations.Add("${trackedFile}:$($match.LineNumber)") }
  } catch {
    continue
  }
}

$qualityResults = @()
$qualityConfigurationFindings = New-Object System.Collections.Generic.List[string]
if (-not $SkipQualityChecks) {
  $checks = New-Object System.Collections.Generic.List[object]

  # Installing dependencies mutates node_modules and may require network access,
  # so it is opt-in. -SkipInstall is retained for compatibility with the
  # supplied runner and always wins over -InstallDependencies.
  if ($InstallDependencies -and -not $SkipInstall) {
    $installArgs = if (Test-Path -LiteralPath (Join-Path $repo 'package-lock.json')) {
      @('ci', '--no-audit', '--fund=false')
    } else {
      @('install', '--no-audit', '--fund=false')
    }
    $checks.Add(@{ Name = 'dependency install'; Args = $installArgs; Script = $null })
  }

  $checks.Add(@{ Name = 'lint'; Args = @('run', 'lint'); Script = 'lint' })
  $checks.Add(@{ Name = 'typecheck'; Args = @('run', 'typecheck'); Script = 'typecheck' })
  if (-not $SkipTests) {
    $checks.Add(@{ Name = 'test'; Args = @('test'); Script = 'test' })
  }
  if (-not $SkipBuild) {
    $checks.Add(@{ Name = 'build'; Args = @('run', 'build'); Script = 'build' })
  }
  $checks.Add(@{ Name = 'npm audit --omit=dev'; Args = @('audit', '--omit=dev'); Script = $null })

  foreach ($check in $checks) {
    if ($check.Script -and -not (Has-PackageScript -Package $package -Name $check.Script)) {
      $qualityConfigurationFindings.Add("Package script is missing: $($check.Script).")
      continue
    }
    $qualityResults += Invoke-QualityCheck -Name $check.Name -CommandArgs $check.Args
  }
}

$criticalFindings = New-Object System.Collections.Generic.List[string]
if ($criticalTenantPolicy) {
  $criticalFindings.Add('Authenticated-wide RLS policies remain effective for teams and team_members; no later tenant-scoped replacement was found.')
}
foreach ($truncation in $inventoryTruncations) {
  $criticalFindings.Add("Audit inventory is incomplete: $truncation")
}
if ($suspiciousLocations.Count -gt 0) {
  $criticalFindings.Add('Potential committed secret pattern locations require human verification; values were not printed.')
}
$failedQualityResults = @($qualityResults | Where-Object ExitCode -ne 0)
$buildResult = $qualityResults | Where-Object Name -eq 'build' | Select-Object -First 1
if ($buildResult -and $buildResult.ExitCode -ne 0) {
  $criticalFindings.Add('Production build failed.')
}
if (-not $SkipQualityChecks -and -not $SkipBuild -and -not (Has-PackageScript -Package $package -Name 'build')) {
  $criticalFindings.Add('Production build script is missing.')
}
if ($Strict) {
  foreach ($result in $failedQualityResults) {
    if (-not $criticalFindings.Contains("Strict quality gate failed: $($result.Name).")) {
      $criticalFindings.Add("Strict quality gate failed: $($result.Name).")
    }
  }
  foreach ($finding in $qualityConfigurationFindings) {
    $criticalFindings.Add("Strict quality configuration failure: $finding")
  }
}

$automatedDecision = if ($criticalFindings.Count -gt 0) {
  'AUDIT FAILED - CRITICAL BLOCKERS'
} else {
  # Static automation cannot authorize EPIC 17 by itself. Human review of the
  # consolidated CS-ENG-002 reports remains mandatory even on a clean run.
  'AUDIT PASSED WITH REMEDIATION REQUIRED'
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# CS-ENG-002 Timestamped Repository Audit')
$lines.Add('')
$lines.Add("**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')  ")
$lines.Add("**Repository:** $repo  ")
$lines.Add("**Branch:** $branch  ")
$lines.Add("**Revision:** $head - $headSubject  ")
$lines.Add("**Final script result:** **$automatedDecision**")
$lines.Add('')
$lines.Add('This is static repository evidence. It does not prove migration application, production credentials, provider transactions, Vercel settings, Cloudflare settings, or live tenant isolation.')
$lines.Add('')
$lines.Add('## Execution options')
$lines.Add('')
$lines.Add("- Strict: **$Strict**")
$lines.Add("- MaxFiles per route inventory: **$MaxFiles**")
$lines.Add("- Dependency install requested: **$InstallDependencies**")
$lines.Add("- Dependency install suppressed: **$SkipInstall**")
$lines.Add("- Quality checks skipped: **$SkipQualityChecks**")
$lines.Add("- Tests skipped: **$SkipTests**")
$lines.Add("- Build skipped: **$SkipBuild**")
$lines.Add('')
$lines.Add('## Git baseline')
$lines.Add('')
$lines.Add("- Origin: $origin")
$lines.Add("- Divergence (origin-only, local-only): $divergence")
$tagSummary = if ($tags) { ($tags -split '\r?\n') -join ', ' } else { 'none' }
$lines.Add("- Tags: $tagSummary")
$lines.Add('- Working tree:')
$lines.Add('')
$lines.Add('```text')
$lines.Add($status)
$lines.Add('```')
$lines.Add('')
$lines.Add('## Inventory summary')
$lines.Add('')
$lines.Add('| Artifact | Count |')
$lines.Add('| --- | ---: |')
$lines.Add("| Page route modules | $($pageFiles.Count) |")
$lines.Add("| API route modules | $($apiFiles.Count) |")
$lines.Add("| Components | $($componentFiles.Count) |")
$lines.Add("| Library/service files | $($libFiles.Count) |")
$lines.Add("| Supabase migrations | $($migrationFiles.Count) |")
$lines.Add("| Test files | $($testFiles.Count) |")
$lines.Add("| Test files in default npm test expansion | $($defaultTestFiles.Count) |")
$lines.Add("| GitHub workflow files | $($workflowFiles.Count) |")
$lines.Add("| Audit/utility scripts | $($scriptFiles.Count) |")
$lines.Add("| Inventory truncations | $($inventoryTruncations.Count) |")
$lines.Add('')
$lines.Add("Framework: Next.js $($package.dependencies.next); React $($package.dependencies.react); TypeScript $($package.devDependencies.typescript). Package manager evidence: $($lockfiles -join ', '). Node engine: $(if ($package.engines.node) { $package.engines.node } else { 'not declared' }).")
$lines.Add('')
$lines.Add('## Critical automated findings')
$lines.Add('')
if ($criticalFindings.Count -eq 0) { $lines.Add('- None detected by this script. Human audit is still required.') }
foreach ($finding in $criticalFindings) { $lines.Add("- **CRITICAL:** $finding") }
$lines.Add('')
$lines.Add('## Migration checks')
$lines.Add('')
$lines.Add("- Duplicate numeric prefixes: $(if ($duplicateMigrationPrefixes.Count) { ($duplicateMigrationPrefixes.Name -join ', ') } else { 'none' })")
$lines.Add("- Empty migrations: $(if ($emptyMigrations.Count) { ($emptyMigrations.Name -join ', ') } else { 'none' })")
$lines.Add("- Confirmed teams/team_members tenant-policy blocker: **$criticalTenantPolicy**")
$lines.Add("- Source contains unrestricted USING (true) or WITH CHECK (true) policy text: **$($allMigrationText -match '(?is)(using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\))')**")
$lines.Add('')
$lines.Add('## Router checks')
$lines.Add('')
$lines.Add("- App Router present: **$($pageFiles.Count -gt 0)**")
$lines.Add("- Pages Router present: **$hasPagesRouter**")
$lines.Add("- Duplicate resolved page routes: $(if ($duplicateRoutes.Count) { ($duplicateRoutes.Name -join ', ') } else { 'none detected' })")
$lines.Add('')
$lines.Add('## Environment-variable register')
$lines.Add('')
$lines.Add('| Name | Exposure | Example parity | Classification |')
$lines.Add('| --- | --- | --- | --- |')
foreach ($name in @($envNames | Sort-Object)) {
  $exposure = if ($name.StartsWith('NEXT_PUBLIC_')) { 'browser-visible' } else { 'server-only by naming' }
  $classification = if ($name -match 'HOPAE|STRIPE|WORLD|OPENAI|TURNSTILE') { 'provider-specific' } elseif ($name -match 'TEST|MOCK|DEMO|DEV') { 'test/development control' } elseif ($name -match 'SUPABASE|ADMIN') { 'runtime/security' } else { 'runtime' }
  $lines.Add("| $name | $exposure | $(if ($exampleNames.Contains($name)) { 'documented' } else { '**missing**' }) | $classification |")
}
$unusedExampleNames = @($exampleNames | Where-Object { -not $envNames.Contains($_) } | Sort-Object)
$lines.Add('')
$unusedExampleSummary = if ($unusedExampleNames.Count) { $unusedExampleNames -join ', ' } else { 'none' }
$lines.Add("Example-only or indirectly referenced names: $unusedExampleSummary.")
$lines.Add('')
$lines.Add('## Secret and environment-file checks')
$lines.Add('')
$trackedEnvSummary = if ($trackedEnvFiles.Count) { $trackedEnvFiles -join ', ' } else { 'none' }
$suspiciousSummary = if ($suspiciousLocations.Count) { $suspiciousLocations -join ', ' } else { 'none detected' }
$lines.Add("- Tracked environment files: $trackedEnvSummary")
$lines.Add("- Suspicious committed secret-pattern locations (values suppressed): $suspiciousSummary")
$lines.Add('')
$lines.Add('## Quality and security check results')
$lines.Add('')
if ($SkipQualityChecks) {
  $lines.Add('All quality checks were skipped by caller. This run cannot replace the validated full audit.')
} else {
  $lines.Add('| Check | Exit | Seconds | Result |')
  $lines.Add('| --- | ---: | ---: | --- |')
  foreach ($result in $qualityResults) {
    $lines.Add("| $($result.Name) | $($result.ExitCode) | $($result.DurationSeconds) | $(if ($result.ExitCode -eq 0) { 'PASS' } else { 'FAIL' }) |")
  }
  foreach ($result in $qualityResults) {
    $lines.Add('')
    $lines.Add("### $($result.Name) output tail")
    $lines.Add('')
    $lines.Add('```text')
    $lines.Add($result.Tail)
    $lines.Add('```')
  }
  if ($qualityConfigurationFindings.Count -gt 0) {
    $lines.Add('')
    $lines.Add('### Quality configuration findings')
    $lines.Add('')
    foreach ($finding in $qualityConfigurationFindings) {
      $lines.Add("- $finding")
    }
  }
  if ($SkipTests) {
    $lines.Add('')
    $lines.Add('- Tests were skipped by caller; test status is not established by this run.')
  }
  if ($SkipBuild) {
    $lines.Add('')
    $lines.Add('- Build was skipped by caller; build status is not established by this run.')
  }
}
$lines.Add('')
$lines.Add('## Page route inventory')
$lines.Add('')
$lines.Add('| Route | File | Type | Expected auth | Actual auth evidence | Tenant expectation | Status | Duplicate risk |')
$lines.Add('| --- | --- | --- | --- | --- | --- | --- | --- |')
foreach ($row in $pageRows) {
  $duplicate = if (($pageRows | Where-Object Route -eq $row.Route).Count -gt 1) { 'yes' } else { 'no' }
  $lines.Add("| $($row.Route) | $($row.File) | $($row.Type) | $($row.ExpectedAuth) | $($row.ActualAuth) | $($row.TenantExpectation) | $($row.Status) | $duplicate |")
}
$lines.Add('')
$lines.Add('## API route inventory')
$lines.Add('')
$lines.Add('| Method | Path | File | Purpose | Auth | Authorization | Tenant scope | Validation | Rate limit | Logging | Tests | Status |')
$lines.Add('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
foreach ($row in $apiRows) {
  $lines.Add("| $($row.Method) | $($row.Path) | $($row.File) | $($row.Purpose) | $($row.Auth) | $($row.Authorization) | $($row.Tenant) | $($row.Validation) | $($row.RateLimit) | $($row.Logging) | $($row.Tests) | $($row.Status) |")
}
$lines.Add('')
$lines.Add('## Limitations')
$lines.Add('')
$lines.Add('- Route and API classifications are conservative static heuristics and require human review.')
$lines.Add('- RLS findings describe migration source, not confirmed deployed Supabase state.')
$lines.Add('- External Vercel, Cloudflare, Supabase and provider-console state is not modified or inferred.')
$lines.Add('- Secret scanning is pattern-based and does not replace a dedicated scanner or history scan.')

$lines | Set-Content -LiteralPath $reportPath -Encoding utf8
Write-Output "CS-ENG-002 report: $reportPath"
Write-Output "Critical findings: $($criticalFindings.Count)"

if ($criticalFindings.Count -gt 0) { exit 2 }
exit 0
