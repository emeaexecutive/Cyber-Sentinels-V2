# Stripe Identity qualification

Updated: 2026-09-29. Source baseline: main `64d02b5`; bounded qualification work on `feat/real-provider-qualification`.

| Dimension | Current classification |
| --- | --- |
| Implementation | WORKING in controlled local tests |
| Session lifecycle | IMPLEMENTED; completion projection and retry gaps remain |
| Webhook | IMPLEMENTED; actual signed provider delivery UNEXERCISED |
| Real provider qualification | BLOCKED_EXTERNAL |
| Real sandbox exchange | NOT EXERCISED |
| Production exercised | NO |

The 2026-09-24 record reports that the founder's company/business setup or authorization in Spain was incomplete and that Stripe prevented the account from progressing to qualification. This remains historical owner-reported account information, not a newly verified account restriction or a determination of Spanish legal requirements. Current account eligibility has not been established.

Implementation status and external qualification are separate. This update includes read-only configuration discovery and local boundary tests. No real VerificationSession, signed provider delivery, provider API read/write, or database evidence insertion was performed. Password recovery and prior Production deployments are unrelated to Stripe Identity qualification.

## Existing implementation evidence

- [`lib/identity-signals/runtime.ts`](../../lib/identity-signals/runtime.ts) creates VerificationSessions with tenant, subject and verification-request bindings, and retrieves current sessions for normalization.
- [`lib/identity-signals/provider-resilience.ts`](../../lib/identity-signals/provider-resilience.ts) implements the Stripe Identity adapter and explicit pending, failure and unavailable outcomes.
- [`app/api/identity/verifications/route.ts`](../../app/api/identity/verifications/route.ts) connects session creation to the existing authenticated verification workflow.
- [`lib/identity-signals/stripe-webhook.ts`](../../lib/identity-signals/stripe-webhook.ts) verifies signed raw events, enforces account/environment bindings, refetches the current session, and persists normalized evidence using replay reservations.
- [`lib/identity-signals/stripe-webhook-store.ts`](../../lib/identity-signals/stripe-webhook-store.ts) resolves the existing session-to-request linkage. Unknown or ambiguous linkage fails closed.
- [`docs/api/identity-signal-engine.md`](../api/identity-signal-engine.md) documents the API boundary. Provider identity evidence neither grants authority nor issues a canonical ALLOW.
- [`tests/stripe-identity-session-starter.test.mjs`](../../tests/stripe-identity-session-starter.test.mjs), [`tests/identity-provider-runtime.test.mjs`](../../tests/identity-provider-runtime.test.mjs), and [`tests/identity-provider-resilience.test.mjs`](../../tests/identity-provider-resilience.test.mjs) cover implementation behavior with controlled fixtures. Those fixtures are not real provider proof.

## Current external blockers

- Vercel Production metadata lists `STRIPE_SECRET_KEY` and `STRIPE_IDENTITY_WEBHOOK_SECRET`; Preview lists neither. This establishes names only. Local process and `.env.local` checks found neither credential.
- A names/mode-only diagnostic through Vercel CLI 59.23.2 `env run --environment production` could not inspect the sensitive values: Vercel reported that 23 sensitive values could not be exported. Neither Stripe value reached the child process. Production key mode, account identity, Identity eligibility, endpoint registration and signing-secret alignment remain unverified. No environment pull or credential-value output was used.
- No installed callable Stripe app tools were available. Plugin discovery found an uninstalled general Stripe connector; its listing does not establish support for Identity. No installation or account changes occurred.
- A real qualification needs an Identity-enabled, authorized test account or sandbox, isolated nonproduction application data, a securely available test key, and its matching real webhook endpoint secret. Production credential-name presence does not meet these prerequisites.

## Environment isolation correction

The canonical loader previously accepted signed, server-verified `PASS`/`VERIFIED` identity evidence without matching its normalized environment to the requested action. A sandbox Stripe result could therefore contribute positive identity evidence to a Production decision. Provider verification alone does not authorize that reuse.

[`src/lib/trust-transaction/canonical.ts`](../../src/lib/trust-transaction/canonical.ts) now passes the exact action environment to [`lib/trust-transaction/server.ts`](../../lib/trust-transaction/server.ts). Identity-signal rows are eligible only when both sides match one of `production`, `staging`, or `sandbox`. The same rule applies to Stripe, World ID and other providers in this ledger. There are no aliases or implicit cross-environment permissions: Production cannot cross to sandbox, staging cannot cross to sandbox, and unknown/missing/malformed environments are ineligible. Filtering precedes latest-per-provider selection, and stored history remains intact.

This change covers `identity_signal_evidence`; it does not claim new environment guarantees for native evidence, the separate legacy Hopae ledger, or arbitrary evidence objects. The existing 50-row retrieval bound remains: an older matching observation beyond that window can be unavailable, which fails closed. Identity evidence still requires independent authority and policy evaluation; it cannot issue an ALLOW by itself.

[`tests/canonical-evidence-subject-routing.test.mjs`](../../tests/canonical-evidence-subject-routing.test.mjs) executes the actual loader and identity mapper plus canonical collection. It verifies exact environment plumbing, both directions of mismatch, all supported environment pairs across multiple providers, malformed/unknown rejection, older matching evidence selection, retained signature requirements, and unchanged native routing.

Focused validation: **70 tests passed** using:

```sh
npx tsx --test tests/canonical-evidence-subject-routing.test.mjs tests/stripe-identity-session-starter.test.mjs tests/identity-provider-runtime.test.mjs tests/identity-provider-resilience.test.mjs
```

## Remaining implementation limitations

- Session creation supplies tenant, subject and request metadata but no Stripe request-level idempotency key or enforced test-mode guard. The application reserves its own request idempotency key; that is separate from Stripe create-call idempotency. A persistence failure after creation can leave an unlinked provider session.
- The webhook appends normalized evidence but does not recalculate the verification request's confidence/status or mark its provider transaction complete. The initial request projection can remain `PARTIAL` after a verified callback.
- Duplicate webhook reservations are acknowledged only after processing. Failed/in-progress reservations currently return 503 without a retry transition or consumer in this path.
- Normalization uses session creation time for `verified_at`, not a verified completion timestamp. This can conservatively age evidence earlier than completion.
- Stripe normalization writes confidence on a 0–1 scale, while the canonical identity mapper divides stored confidence by 100; a HIGH result of 0.9 becomes 0.009. This existing scale mismatch understates assurance and is outside the environment-isolation correction.
- The API returns private client completion data; no existing application UI was found consuming that Stripe hosted completion URL. These limitations are recorded, not broadened into a new provider runtime in this change.

## Real sandbox qualification procedure

After the prerequisites are available, use the existing authenticated `POST /api/identity/verifications` with an authorized nonproduction tenant/subject, `X-Enterprise-Id`, `Idempotency-Key`, and explicit `signalInputs.stripe_identity`. Confirm the securely configured key is test-mode before creating anything. Complete the returned hosted Stripe session privately using Stripe's predefined test scenario, then receive the genuine own-account snapshot webhook at `/api/stripe/identity/webhook` with its matching endpoint secret. Do not manufacture events, manually insert evidence, or use a generated local signature as provider proof. The [official hosted verification guide](https://docs.stripe.com/identity/verify-identity-documents?platform=web&type=redirect) describes account setup and test completion; [Stripe's webhook documentation](https://docs.stripe.com/webhooks) describes genuine endpoint delivery and signing secrets.

Confirm authoritative session `livemode: false`, matching stored tenant/subject/request linkage, one processed event reservation, and normalized evidence without document or biometric payloads. Then exercise the existing canonical action flow with separate valid authority and policy, preserving its actual decision and receipt/replay/memory references. If exercising replay, use a real provider resend of that event. A browser return or successful provider identity response alone is insufficient.

Record this as sandbox execution only: Stripe states that test-key verification checks are not actually processed, even though the lifecycle resembles live mode. Sandbox exercise therefore proves integration behavior, not real identity assurance or Production qualification. See the [VerificationSession create API](https://docs.stripe.com/api/identity/verification_sessions/create), [session handling and idempotency guidance](https://docs.stripe.com/identity/verification-sessions), and [sandbox isolation documentation](https://docs.stripe.com/sandboxes).

This is the current Stripe **Identity** qualification record. The dated June billing snapshot in [`docs/STRIPE_STATUS.md`](../STRIPE_STATUS.md) remains historical and does not describe the current Identity implementation.
