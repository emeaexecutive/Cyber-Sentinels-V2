param([switch]$NoPause)
$code = 2
$report = $null
try {
  npm.cmd run verify:17.2
  $code = $LASTEXITCODE
  $report = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "reports") -Filter "epic-17.2-verification-*.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
catch { Write-Host "EPIC 17.2 verification could not start safely." -ForegroundColor Red }
finally {
  Write-Host "EPIC 17.2 verification code: $code"
  if ($report) { Write-Host "Report: $($report.FullName)" }
  Write-Host "Verification launcher finished."
  if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
}
