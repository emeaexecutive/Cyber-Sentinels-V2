# EPIC 17.1D Test Report

The focused command is `npm run test:trust-events`. It covers:

- deterministic key ordering, UTC timestamps, finite-number rules and rejection of unsupported/cyclic-risk values;
- stable SHA-256 event hashes and tamper detection;
- valid Hopae raw-byte HMAC, invalid signature, expired timestamp, exact duplicate, same-key/different-body conflict and no duplicate evidence/events;
- concurrent deliveries producing contiguous per-enterprise sequence and previous-hash links;
- World ID proof receipt remaining inconclusive with zero confidence and no server verification;
- unsupported placeholders creating neither positive evidence nor Trust Events;
- RLS/grant policy, strict canonical-row constraints, append-only controls, finalized-envelope immutability, scoped idempotency, nonce replay, Evidence Vault encryption constraints and tenant/provider advisory locking;
- authenticated tenant scoping, stable compound pagination, correlation IDs, exact-byte ingestion, established Hopae callback bridging, integrity ID validation and integrity endpoint behavior by API contract inspection.

The repository gates are `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run verify:17.1d`. The timestamped verifier report in `reports` is the runtime record of the most recent execution. Database integration assertions are static unless a disposable Supabase target is explicitly supplied; no Production data or infrastructure is modified by the verifier.

## Final local result

On 2026-07-20, the final focused suite passed 21/21 tests, the complete repository suite passed, TypeScript passed, lint completed with no errors (six unrelated existing warnings), the Next.js production build passed, and `npm audit --omit=dev` reported zero vulnerabilities. The `-NoPause` PowerShell launcher completed its `finally` block and the verifier returned exit code 0.

Supabase migration deployment, live RLS behavior, signed Hopae sandbox delivery, Vercel controls and Cloudflare controls were not exercised against external infrastructure. They remain `BLOCKED_BY_EXTERNAL_CONFIGURATION`, and this result is not deployment approval.
