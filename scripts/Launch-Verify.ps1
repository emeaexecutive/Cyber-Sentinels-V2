[CmdletBinding()]
param(
  [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"
if (-not $PSCommandPath -or -not (Test-Path -LiteralPath $PSCommandPath)) { throw "Launch-Verify.ps1 must be run from its saved file." }
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $repoRoot

$nodeCommand = Get-Command node.cmd -ErrorAction SilentlyContinue
if (-not $nodeCommand) { $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue }
if (-not $nodeCommand) { throw "Node.js is not available on PATH." }
$nodeVersion = [string](& $nodeCommand.Source --version | Select-Object -First 1)
if (-not $nodeVersion) { throw "Node.js is not available on PATH." }
$nodeMajor = [int]($nodeVersion.TrimStart("v").Split(".")[0])
if ($nodeMajor -ne 22) { throw "Node.js 22 is required. Found $nodeVersion." }
$branch = [string](& git branch --show-current | Select-Object -First 1)
if ($branch.Trim() -ne "main") { throw "Verification is authorized only on main." }
if (git diff --name-only --diff-filter=U) { throw "Unresolved merge conflicts are present." }
& git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check found whitespace errors." }
$repositoryStatus = git status --porcelain --untracked-files=all | Where-Object { $_ -notmatch '^\?\? reports/' }
if (-not $AllowDirty -and $repositoryStatus) { throw "The worktree must be clean except for generated reports. Commit intentional changes first." }

$package = Get-Content -LiteralPath (Join-Path $repoRoot "package.json") -Raw | ConvertFrom-Json
if ($package.engines.node -ne "22.x") { throw "package.json must pin engines.node to 22.x." }
$scriptNames = @($package.scripts.PSObject.Properties.Name)
$commands = @("lint", "typecheck", "test:cookie-consent", "test:consent", "test:rls", "test")
$commands += $scriptNames | Where-Object { $_ -like "verify:*" } | Sort-Object
$results = [System.Collections.Generic.List[string]]::new()
$started = Get-Date

foreach ($name in $commands) {
  if ($scriptNames -notcontains $name) { $results.Add("SKIPPED npm run $name (script not defined)"); continue }
  if ($name -eq "test:rls" -and $env:RUN_RLS_TESTS -ne "true") {
    $results.Add("SKIPPED npm run test:rls (RUN_RLS_TESTS=true and authoritative Supabase test credentials are required; static consent RLS tests run in test:consent)")
    continue
  }
  Write-Host "VERIFY npm run $name"
  & npm.cmd run $name
  if ($LASTEXITCODE -ne 0) { throw "npm run $name failed with exit code $LASTEXITCODE." }
  $results.Add("PASS npm run $name")
}

if ($scriptNames -contains "build") {
  Write-Host "VERIFY npm run build"
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE." }
  $results.Add("PASS npm run build")
} else { throw "A production build script is required." }

$reportDirectory = Join-Path $repoRoot "reports"
New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportDirectory "ops-002-verification-$stamp.md"
$commit = [string](& git rev-parse HEAD | Select-Object -First 1)
$body = @("# EPIC-OPS-002 verification", "", "- Started: $($started.ToUniversalTime().ToString('o'))", "- Finished: $((Get-Date).ToUniversalTime().ToString('o'))", "- Node: $nodeVersion", "- Branch: main", "- Commit: $($commit.Trim())", "", "## Gates", "") + ($results | ForEach-Object { "- $_" })
Set-Content -LiteralPath $reportPath -Value $body -Encoding utf8
Write-Host "Verification passed. Report: $reportPath"
