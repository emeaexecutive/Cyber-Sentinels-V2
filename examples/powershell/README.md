# Agent Gamma PowerShell quickstart

`agent-gamma.ps1` is a standalone HTTP client. It imports no Cyber Sentinels application module, Supabase client, database credential, service-role credential, or test fixture. OpenSSL performs Ed25519 key generation and signing. The private key exists only in a process-specific temporary directory and is removed in `finally`.

## Prerequisites

- Windows PowerShell 5.1 or PowerShell 7+
- OpenSSL with Ed25519 support (`openssl` on `PATH`, `OPENSSL_PATH`, Git for Windows OpenSSL, or OpenSSL-Win64)
- the exact approved non-Production HTTPS URL from the PR deployment check
- a one-time `cs_test_...` key with all six scopes:
  `agents:write`, `agents:verify`, `authority:read`, `trust:request`, `trust:read`, `outcomes:write`

Set credentials in the current shell, not in this script:

```powershell
$env:CYBER_SENTINELS_BASE_URL="https://<approved-non-production-host>"
$env:CYBER_SENTINELS_API_KEY="<paste the one-time secret>"
pwsh -NoProfile -File ./examples/powershell/agent-gamma.ps1
```

For a protected Preview, an authorized operator may set the independently
issued automation credential in the same process. It does not replace the API
key:

```powershell
$env:VERCEL_AUTOMATION_BYPASS_SECRET="<provided separately by the Preview owner>"
```

Use `powershell.exe` instead of `pwsh` for Windows PowerShell 5.1. HTTP is refused except when `-AllowInsecureLocalhost` is explicitly supplied for local contract testing. Local execution is never external qualification evidence.

The script preflights URL syntax, HTTPS, non-Production targeting, key structure, OpenAPI identity, API reachability, API-key authentication, and `authority:read`. It detects Vercel Authentication/SSO before registration. If an authorized Vercel automation bypass is already present in `VERCEL_AUTOMATION_BYPASS_SECRET`, the client forwards it without logging it. The script does not create or weaken a bypass.

Success includes registration, public credential binding, signed manifest, challenge proof, VERIFIED identity, authority, canonical READ/ALLOW, idempotent retry, WRITE/DENY, transaction, Replay, receipt, trust state, outcome classification, and challenge-replay rejection.

## Why a pasted command sequence kept running

`$ErrorActionPreference = "Stop"` is not a transaction around everything pasted into an interactive console. It promotes non-terminating PowerShell cmdlet errors in the current execution scope, but each top-level pasted statement may still be accepted and executed separately. Native commands also report failure through their exit code unless explicitly checked (PowerShell 7 has additional native-command behavior, but scripts must not depend on an interactive preference). A null method invocation can terminate only that statement while later pasted statements remain queued.

This quickstart puts the complete workflow inside one `try/catch/finally`, explicitly validates every prerequisite and identifier, checks every HTTP response, and exits non-zero. Registration failure therefore cannot cascade into `/agents//...` requests.
