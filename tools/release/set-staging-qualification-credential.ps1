# Run manually in your own PowerShell terminal, outside agent capture.
# Stores only the existing Staging service-role JWT, encrypted for this Windows user.
$ErrorActionPreference = 'Stop'
$credentialDirectory = Join-Path $env:LOCALAPPDATA 'CyberSentinels\staging-qualification'
New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = Get-Acl -LiteralPath $credentialDirectory
$acl.SetAccessRuleProtection($true,$false)
$acl.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
Set-Acl -LiteralPath $credentialDirectory -AclObject $acl
$secret = Read-Host 'Existing service_role JWT for Staging agpyhygpfmppjkxwcpac (hidden)' -AsSecureString
$pointer = [IntPtr]::Zero
try {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $parts = $plain.Split('.')
  if ($parts.Count -ne 3) { throw 'Use the existing Staging legacy service_role JWT from its API settings.' }
  $payload = $parts[1].Replace('-','+').Replace('_','/')
  $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4),'=')
  $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
  if ($claims.ref -ne 'agpyhygpfmppjkxwcpac' -or $claims.role -ne 'service_role') { throw 'Credential is not the exact Staging service-role key. Nothing was stored.' }
  $secret | Export-Clixml -LiteralPath (Join-Path $credentialDirectory 'service-role.xml')
  Write-Output 'Staging credential stored with Windows-user encryption. Reply ready; do not paste the credential into chat.'
} finally {
  $plain = $null
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  $secret.Dispose()
}
