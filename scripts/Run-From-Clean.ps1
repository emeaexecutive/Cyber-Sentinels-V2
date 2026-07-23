[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ReleaseArguments
)

& (Join-Path $PSScriptRoot "release-node22.ps1") @ReleaseArguments
exit $LASTEXITCODE
