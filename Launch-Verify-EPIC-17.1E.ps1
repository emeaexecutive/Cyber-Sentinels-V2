param([switch]$NoPause)

$RepoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$VerificationCode = 2
try {
  Set-Location -LiteralPath $RepoPath
  & npm.cmd run verify:17.1e
  $VerificationCode = $LASTEXITCODE
  $LatestReport = Get-ChildItem -LiteralPath (Join-Path $RepoPath "reports") -Filter "epic-17.1e-verification-*.md" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  Write-Host "EPIC 17.1E verification code: $VerificationCode"
  if ($LatestReport) { Write-Host "Report: $($LatestReport.FullName)" }
} catch {
  Write-Error "EPIC 17.1E verifier could not run: $($_.Exception.Message)"
} finally {
  Write-Host "Verification launcher finished."
  if (-not $NoPause) { [void](Read-Host "Press Enter to close") }
}
