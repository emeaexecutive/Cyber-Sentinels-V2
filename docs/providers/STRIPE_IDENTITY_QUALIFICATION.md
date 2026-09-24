# Stripe Identity qualification

Recorded: 2026-09-24. Source baseline: Production main `e9a90f973aacbe6967f14a527540208431a2ec13`.

| Dimension | Current classification |
| --- | --- |
| Implementation | WORKING |
| Session lifecycle | IMPLEMENTED |
| Webhook | IMPLEMENTED |
| Real provider qualification | BLOCKED_EXTERNAL |
| Production exercised | NO |

The founder reports that the required company/business setup or authorization in Spain has not yet been completed or obtained, and Stripe currently prevents the account from progressing far enough to perform the required real provider qualification. This is the owner's reported account/business blocker, not a Cyber Sentinels code failure or a determination of Spanish legal requirements.

Implementation status and external qualification are separate. This record does not claim a completed real Stripe verification, a Production provider exchange, or permission to execute an interaction. Password recovery was reported by the owner as Production verified and working; that separate authentication result is not Stripe Identity qualification.

## Existing implementation evidence

- [`lib/identity-signals/runtime.ts`](../../lib/identity-signals/runtime.ts) creates VerificationSessions with tenant, subject and verification-request bindings, and retrieves current sessions for normalization.
- [`lib/identity-signals/provider-resilience.ts`](../../lib/identity-signals/provider-resilience.ts) implements the Stripe Identity adapter and explicit pending, failure and unavailable outcomes.
- [`app/api/identity/verifications/route.ts`](../../app/api/identity/verifications/route.ts) connects session creation to the existing authenticated verification workflow.
- [`lib/identity-signals/stripe-webhook.ts`](../../lib/identity-signals/stripe-webhook.ts) verifies signed raw events, enforces account/environment bindings, refetches the current session, and persists normalized evidence using replay reservations.
- [`lib/identity-signals/stripe-webhook-store.ts`](../../lib/identity-signals/stripe-webhook-store.ts) resolves the existing session-to-request linkage. Unknown or ambiguous linkage fails closed.
- [`docs/api/identity-signal-engine.md`](../api/identity-signal-engine.md) documents the API boundary. Provider identity evidence neither grants authority nor issues a canonical ALLOW.
- [`tests/stripe-identity-session-starter.test.mjs`](../../tests/stripe-identity-session-starter.test.mjs), [`tests/identity-provider-runtime.test.mjs`](../../tests/identity-provider-runtime.test.mjs), and [`tests/identity-provider-resilience.test.mjs`](../../tests/identity-provider-resilience.test.mjs) cover implementation behavior with controlled fixtures. Those fixtures are not real provider proof.

## Qualification boundary

No additional Stripe qualification is authorized in this work. Preserve the current implementation and security bindings. Do not manufacture webhook events or verification records, insert provider evidence manually, bypass account requirements, change SQL or environment variables, or mark Production exercised from code tests or credential presence.

The blocker remains external until the owner supplies evidence that the account can proceed and separately authorizes a real provider qualification. No eligibility investigation, account changes, or provider calls were made for this status update.

This is the current Stripe **Identity** qualification record. The dated June billing snapshot in [`docs/STRIPE_STATUS.md`](../STRIPE_STATUS.md) remains historical and does not describe the current Identity implementation.
