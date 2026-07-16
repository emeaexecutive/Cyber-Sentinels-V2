# RC1 Security Gate

Review date: 2026-07-16.

| Control | Repository result | Status |
| --- | --- | --- |
| Authentication and authorization | Session plus workspace/case RLS; action, purpose, evidence minimum, expiry and revocation are server-resolved policy fields | Pass |
| Tenant isolation | Canonical proof and Evidence Graph relationship stores require owner or workspace access | Pass after migration |
| Provider secrets | Server-only; never returned or logged | Pass |
| Signature/timestamp | Timing-safe SHA-256 HMAC; five-minute tolerance | Pass |
| Nonce/idempotency/replay protection | Hashed nonce, unique event ID, atomic conflict handling | Pass |
| Rate/payload limits | Process-local request limit and 256 KB ceiling | Pass with deployment caveat |
| Retention | Normalized evidence and callback digest only | Pass |
| Trust Memory | Trigger rejects update/delete of memory events | Pass after migration |
| Least privilege | Persistence RPC executable only by service role | Pass |

Critical failures reject the callback or roll back the proof commit. Deployment blockers: apply and verify the migration; configure and rotate credentials; validate real provider signature semantics; use deployment-level rate limiting for multi-instance abuse control; run authenticated negative RLS checks in the target Supabase project.

Authority, revocation, expiry, action and purpose scope, and minimum evidence are re-read from the tenant policy at callback time. The provider-session snapshot is retained for audit continuity but is never treated as current authorization.
