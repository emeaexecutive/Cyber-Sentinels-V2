[CmdletBinding()]
param(
    [string]$RepoPath = "C:\Users\emeae\Desktop\cyber-sentinels-clean",
    [switch]$SkipInstall,
    [switch]$NoPause
)

$ErrorActionPreference = "Stop"
$script:ExitCode = 2

function Invoke-Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host ""
    Write-Host "==> $Name"
    $global:LASTEXITCODE = 0
    & $Action
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
    if ($code -ne 0) { throw "$Name failed with exit code $code" }
}

function Get-PackageScripts {
    $packagePath = Join-Path $RepoPath "package.json"
    if (-not (Test-Path -LiteralPath $packagePath)) { throw "package.json not found" }
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    if (-not $package.scripts) { return @() }
    return @($package.scripts.PSObject.Properties.Name)
}

function Invoke-FirstScript {
    param([string]$Label, [string[]]$Candidates, [switch]$Required)
    $scripts = Get-PackageScripts
    foreach ($candidate in $Candidates) {
        if ($scripts -contains $candidate) {
            Invoke-Step "$Label ($candidate)" { npm run $candidate }
            return
        }
    }
    if ($Required) { throw "$Label is required but no matching script exists: $($Candidates -join ', ')" }
    Write-Host "[SKIPPED] $Label — no configured script"
}

try {
    if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) {
        throw "Repository not found: $RepoPath"
    }

    Set-Location -LiteralPath $RepoPath

    Write-Host "Cyber Sentinels — Clean OPS-002.2 / EPIC 19 Verification"
    Write-Host "Repository: $RepoPath"

    Invoke-Step "Git repository" { git rev-parse --is-inside-work-tree | Out-Null }

    $branch = (git branch --show-current).Trim()
    if ($branch -ne "main") { throw "Run from main. Current branch: $branch" }

    $conflicts = @(git diff --name-only --diff-filter=U)
    if ($conflicts.Count -gt 0) { throw "Merge conflicts detected: $($conflicts -join ', ')" }

    Invoke-Step "Git diff check" { git diff --check }

    $dirty = @(git status --porcelain)
    if ($dirty.Count -gt 0) {
        Write-Host ""
        Write-Host "Working tree changes:"
        git status --short
        throw "Working tree is not clean. Review, commit or stash the files above."
    }

    Invoke-Step "Fetch origin" { git fetch origin }

    $nodeVersion = (& node --version).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Node.js is unavailable" }
    $nodeMajor = [int](($nodeVersion -replace '^v','').Split('.')[0])
    if ($nodeMajor -ne 22) { throw "Node.js 22.x is required. Active version: $nodeVersion" }
    Write-Host "[PASS] Node.js $nodeVersion"

    $npmVersion = (& npm --version).Trim()
    if ($LASTEXITCODE -ne 0) { throw "npm is unavailable" }
    Write-Host "[PASS] npm $npmVersion"

    if (-not $SkipInstall) {
        Invoke-Step "Install dependencies" { npm ci }
    } else {
        Write-Host "[SKIPPED] Install dependencies"
    }

    Invoke-FirstScript "Lint" @("lint", "check:lint")
    Invoke-FirstScript "Typecheck" @("typecheck", "type-check", "check:types")
    Invoke-FirstScript "Cookie consent tests" @("test:cookie-consent", "test:consent", "test:cookies")
    Invoke-FirstScript "EPIC 19 tests" @("test:epic19", "test:trust-runtime")
    Invoke-FirstScript "Tests" @("test:ci", "test")
    Invoke-FirstScript "OPS verifier" @("verify:18", "verify:ops-002")
    Invoke-FirstScript "EPIC 19 verifier" @("verify:19", "verify:epic-19")
    Invoke-FirstScript "Build" @("build") -Required

    $script:ExitCode = 0
    Write-Host ""
    Write-Host "=============================================="
    Write-Host " CLEAN VERIFICATION COMPLETE"
    Write-Host " OPS-002.2 + EPIC 19 READY FOR REVIEW"
    Write-Host "=============================================="
}
catch {
    $script:ExitCode = 2
    Write-Host ""
    Write-Host "Workflow failed: $($_.Exception.Message)"
}
finally {
    Write-Host "Result code: $script:ExitCode"
    if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
}

exit $script:ExitCode
