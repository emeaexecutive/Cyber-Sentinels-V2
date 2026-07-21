[CmdletBinding()]
param(
  [switch]$DeployProduction,
  [switch]$SkipLiveChecks
)

$ErrorActionPreference = "Stop"
if (-not $PSCommandPath -or -not (Test-Path -LiteralPath $PSCommandPath)) { throw "Launch-Production.ps1 must be run from its saved file." }
if (-not $DeployProduction) { throw "Production deployment requires the explicit -DeployProduction switch." }
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $repoRoot
$nodeCommand = Get-Command node.cmd -ErrorAction SilentlyContinue
if (-not $nodeCommand) { $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue }
if (-not $nodeCommand) { throw "Node.js is not available on PATH." }
$nodeVersion = [string](& $nodeCommand.Source --version | Select-Object -First 1)
if (-not $nodeVersion) { throw "Node.js is not available on PATH." }
if ([int]($nodeVersion.TrimStart("v").Split(".")[0]) -ne 22) { throw "Node.js 22 is required. Found $nodeVersion." }
$branch = [string](& git branch --show-current | Select-Object -First 1)
if ($branch.Trim() -ne "main") { throw "Production deployment is authorized only from main." }
if (git diff --name-only --diff-filter=U) { throw "Unresolved merge conflicts are present." }
& git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check found whitespace errors." }
$repositoryStatus = git status --porcelain --untracked-files=all | Where-Object { $_ -notmatch '^\?\? reports/' }
if ($repositoryStatus) { throw "Production deployment requires a clean worktree except for generated reports." }

& (Join-Path $PSScriptRoot "Launch-Verify.ps1")
if ($LASTEXITCODE -ne 0) { throw "Verification launcher failed." }
& npx.cmd vercel whoami
if ($LASTEXITCODE -ne 0) { throw "Vercel authentication is unavailable." }
& npx.cmd vercel pull --yes --environment=production
if ($LASTEXITCODE -ne 0) { throw "Vercel production environment pull failed." }
& npx.cmd vercel build --prod
if ($LASTEXITCODE -ne 0) { throw "Vercel production build failed." }
$deploymentOutput = & npx.cmd vercel deploy --prebuilt --prod --yes 2>&1
if ($LASTEXITCODE -ne 0) { throw "Vercel production deployment failed: $($deploymentOutput -join ' ')" }
$deploymentUrl = ($deploymentOutput | Select-String -Pattern "https://[^\s]+\.vercel\.app" | Select-Object -Last 1).Matches.Value
if (-not $deploymentUrl) { $deploymentUrl = "https://www.cybersentinels.com" }

$liveResults = [System.Collections.Generic.List[string]]::new()
if (-not $SkipLiveChecks) {
  foreach ($path in @("/", "/cookies", "/privacy", "/privacy/preferences", "/api/health", "/api/ready", "/api/consent")) {
    $uri = "https://www.cybersentinels.com$path"
    $response = Invoke-WebRequest -Uri $uri -Method Get -MaximumRedirection 5
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) { throw "Live check failed for $uri with HTTP $($response.StatusCode)." }
    $liveResults.Add("PASS $uri HTTP $($response.StatusCode)")
  }
} else { $liveResults.Add("SKIPPED live checks by explicit switch") }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $repoRoot "reports\ops-002-production-$stamp.md"
$commit = [string](& git rev-parse HEAD | Select-Object -First 1)
$body = @("# EPIC-OPS-002 production release", "", "- Released: $((Get-Date).ToUniversalTime().ToString('o'))", "- Node: $nodeVersion", "- Commit: $($commit.Trim())", "- Deployment: $deploymentUrl", "", "## Live checks", "") + ($liveResults | ForEach-Object { "- $_" })
Set-Content -LiteralPath $reportPath -Value $body -Encoding utf8
Write-Host "Production deployment complete. Report: $reportPath"
