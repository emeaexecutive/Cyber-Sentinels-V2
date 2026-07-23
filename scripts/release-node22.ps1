[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ReleaseArguments
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue }
if (-not $node) { Write-Error "Node.js is not available on PATH."; exit 1 }

$version = [string](& $node.Source --version | Select-Object -First 1)
if ($LASTEXITCODE -ne 0 -or -not $version) { Write-Error "Unable to detect Node.js."; exit 1 }
if ([int]($version.TrimStart("v").Split(".")[0]) -ne 22) {
  Write-Error "Cyber Sentinels production validation requires Node.js 22.x. Detected: $($version.TrimStart('v')). Release aborted."
  exit 1
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
if (-not $npm) { Write-Error "npm is not available on PATH."; exit 1 }

Push-Location -LiteralPath $repoRoot
try {
  & $npm.Source run release -- @ReleaseArguments
  $releaseExitCode = $LASTEXITCODE
}
finally {
  Pop-Location
}
exit $releaseExitCode
