# Password-recovery HTTPS proof

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
