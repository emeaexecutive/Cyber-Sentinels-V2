# EPIC 24 Security Review

## Findings

| Area | Control | Result |
| --- | --- | --- |
| Authentication | Existing Supabase session/workspace context on every user route | Pass |
| Authorization | Read routes tenant-bound; mutations role-bound; override owner/admin only | Pass |
| Tenant isolation | Tenant ID comes from auth; repository filters tenant; RLS membership predicate | Pass by static contract; live-project RLS execution pending environment |
| Ingestion abuse | 60/min route limit, bounded body shape, enums, timestamps, confidence | Pass |
| Replay/idempotency | Unique source/idempotency hash, canonical event hash chain, bounded conflict retry | Pass |
| Metadata injection | Primitive-only metadata; forbidden secret/biometric/location keys in app and SQL | Pass |
| Service-role exposure | Service client imported only by server repository; cron secret server-only | Pass |
| Manual overrides | Owner/admin, mandatory reason, optional future expiry, evidence/state engine, audit/Replay | Pass |
| Audit immutability | Signals, decisions, failures, review/alert history, overrides append-only | Pass |
| Provider spoofing | Human endpoint rejects provider/system sources | Pass |
| Positive trust escalation | Human-authorized positive signals project as inconclusive context; signed provider evidence remains required | Pass |
| Background authorization | Constant-time `CRON_SECRET`; service-role-only SQL functions | Pass |
| Webhook readiness | Existing signed provider paths remain authoritative; generic user route is not a provider webhook | Pass with documented integration boundary |
| Dependency audit | Patched `sharp` override compatible with build/tests; `npm audit --omit=dev` reports zero | Pass |

## Privacy

No raw provider payload, biometric image, document image, password, token, private key, prompt, precise coordinate, or full IP is accepted in signal metadata. Rejection Replay records only a safe code. Structured logs include IDs, operation, category, retryability, and duration only.

## Residual risks

1. Static SQL tests cannot prove deployed RLS behavior without a configured Supabase test project. Run tenant A/tenant B/anonymous service tests before production migration promotion.
2. The process-local API limiter is defense in depth, not a distributed quota. Put an edge/WAF or shared rate limiter in front of high-volume ingestion.
3. Signed provider normalization must remain provider-specific. Do not expose a generic service-role signal endpoint.
4. The 365-day evidence projection expiry is a default, not a legal retention policy. Align it with jurisdiction, contracts, holds, and deletion workflows.
5. `CRON_SECRET` rotation and least-privilege service-role custody remain deployment responsibilities.

## Security gate

No new secret material is stored in the repository. Application authorization and static RLS tests pass. Production activation remains contingent on applying and exercising the migration in the target Supabase environment.
