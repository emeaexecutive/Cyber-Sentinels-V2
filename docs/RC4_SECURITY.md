# RC4 Security Verification

## Control audit

| Control | Source evidence | Current result | Remaining proof |
| --- | --- | --- | --- |
| Authentication | Supabase `getUser`, email-verification gates and protected middleware | Implemented | Credentialed deployment test and recovery-flow rehearsal |
| Authorization | Admin allowlist, verification cookie, authority graph and policy evaluation | Implemented | Role matrix and deployed denial-path evidence |
| RLS | 297 RLS enablement/policy statements across tracked migrations | Implemented in migration source | Apply and test policies in the target Supabase project |
| Webhook signatures | Hopae timestamped HMAC, ATS timing-safe HMAC, Stripe SDK verification | Implemented | Rotate deployment secrets and exercise rejected-signature alerts |
| Secrets | Server-only environment access; no secret values in provider status | Implemented | Deployment inventory, rotation ownership and secret-scanner gate |
| Rate limits | Trust execution, provider callback, ATS and Stripe webhook process-local limits | Implemented with limitation | Replace process-local buckets when distributed enforcement is required |
| Replay protection | Hopae timestamp tolerance and event idempotency; ATS normalized event idempotency | Implemented for those paths | Durable Stripe event-ID replay lock remains outstanding |
| Tenant isolation | Tenant/workflow lookup, RLS, evidence tenant identifiers and integrity validation | Implemented in source | Cross-tenant deployed denial tests |
| Provider isolation | Restricted-data rejection, normalized-only retention and provider timeout isolation | Implemented | Contract and egress review per Live provider |
| Audit logging | Replay, Evidence Graph, Trust Memory, receipts and operational issue capture | Implemented | Retention, export and alert review under pilot traffic |

## RC4 hardening

The Stripe webhook now applies the existing request limiter and a one-megabyte payload ceiling before signature verification and processing. This brings its ingress boundary in line with the Hopae and ATS webhook paths.

## Security blockers

- Source verification does not prove deployed RLS or denial paths.
- Rate limiting is process-local and not a distributed abuse-control guarantee.
- Stripe webhook event IDs are not retained in a dedicated durable replay ledger.
- Provider contracts, retention and regional processing require deployment-specific review.
- No certification or penetration-test claim is made by this audit.
