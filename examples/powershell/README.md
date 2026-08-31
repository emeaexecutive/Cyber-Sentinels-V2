# PowerShell Agent Gamma V1 quickstart

`agent-gamma.ps1` is the standalone Windows/PowerShell implementation of the public V1 agent journey. It uses HTTP with PowerShell semantics, generates and keeps an Ed25519 private key locally with OpenSSL, registers only the public JWK, signs the manifest and challenge, grants and reads bounded authority, proves ALLOW, governed REVIEW, fresh post-review ALLOW, DENY, monotonic revocation, and post-revocation DENY, safely retries the original ALLOW with the same idempotency key, and retrieves transaction, receipt, Replay, trust state, and outcome projections.

Prerequisites:

- Windows PowerShell 5.1 or PowerShell 7+
- OpenSSL available on `PATH`
- the exact approved non-Production HTTPS base URL
- a shown-once `cs_test_` key with `agents:write`, `agents:verify`, `authority:read`, `trust:request`, `trust:read`, and `outcomes:write`

```powershell
$env:CYBER_SENTINELS_BASE_URL = "https://<approved-non-production-host>"
$env:CYBER_SENTINELS_API_KEY = "<shown-once-test-key>"
pwsh -NoProfile -File ./examples/powershell/agent-gamma.ps1
```

The script refuses live keys and Cyber Sentinels Production hostnames, never prints the key or private key, and deletes temporary key files in `finally`. If Vercel Authentication protects the approved Preview, an already-authorized `VERCEL_AUTOMATION_BYPASS_SECRET` may be supplied through the environment; the script never prints it. Do not disable Cyber Sentinels authentication or tenant controls.

Registration creates `PENDING_IDENTITY_PROOF` and grants no business authority. Authority grant/revoke requires an owner/admin key with `authority:write` and a server-persisted management boundary; REVIEW resolution requires `review:write` and an authorized owner/admin/reviewer. `VERIFIED` is not independently `AUTHORIZED`. `REVIEW` and `DENY` both require execution to stop, and an approved review still requires a new decision. DNS failure, timeout, `429`, `500`, or `503` is unavailable, never `ALLOW`.

## Password-recovery HTTPS proof

`password-recovery-proof.ps1` proves only the public password-reset request boundary. It never calls Supabase, uses a service-role credential, creates a recovery session, reads logs, or handles a password.

The target must be the exact qualified Vercel Preview URL. Because headless PowerShell cannot solve an interactive live Turnstile challenge, the Preview must use the repository's branch-scoped `TURNSTILE_MODE=preview-test` configuration with Cloudflare's official test pair. The script submits Cloudflare's public dummy response to the normal product endpoint; the server still performs its normal Turnstile verification. Production rejects this mode and the script refuses every Cyber Sentinels Production hostname.

```powershell
$env:CYBER_SENTINELS_BASE_URL="https://<qualified-preview>.vercel.app"
$env:CYBER_SENTINELS_TEST_EMAIL="<controlled-test-mailbox>"
# Only when Vercel Authentication protects this Preview:
$env:VERCEL_AUTOMATION_BYPASS_SECRET="<provided separately by the Preview owner>"

pwsh -NoProfile -File ./examples/powershell/password-recovery-proof.ps1
```

The script checks Vercel SSO, missing-challenge rejection, malformed-email rejection, equivalent generic responses for the controlled and random unknown address, and HTTP 429 rate limiting. It never prints the email, challenge response, automation bypass, response body, token, PKCE verifier, or password. Any failed invariant exits non-zero with `BLOCKED — <reason>`.

A successful result ends with:

```text
PASSWORD RESET REQUEST WORKING THROUGH CYBER SENTINELS PUBLIC HTTPS ENDPOINT
```

This is network proof, not full recovery proof. A controlled mailbox and browser are still required to prove receipt, link click, PKCE callback, recovery state, password update, old-password rejection, and new-password acceptance.
