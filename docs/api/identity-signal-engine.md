# Identity Signal Engine API

All `/api/identity/*` endpoints require a Supabase user session and a valid `X-Enterprise-Id` header. The server resolves that ID through `trust_workspaces` / `workspace_members`; sending `enterpriseId` in a JSON body is rejected. Mutation endpoints require owner, admin, or reviewer role.

## Endpoints

- `POST /api/identity/subjects`
- `POST /api/identity/verifications` with `Idempotency-Key`
- `GET /api/identity/verifications/{id}`
- `GET /api/identity/subjects/{id}/signals`
- `GET /api/identity/subjects/{id}/confidence`
- `GET /api/identity/providers`
- `GET /api/identity/providers/health`
- `POST /api/providers/hopae/callback`
- `POST /api/providers/world-id/callback`
- `GET /api/health/identity-signals`

## Create a subject

```json
{
  "subjectType": "candidate",
  "displayLabel": "Candidate 1042",
  "externalReference": "internal-reference"
}
```

`externalReference` is optional and accepted only when `SECURITY_HASH_SECRET` is configured. Only its tenant-bound HMAC digest is stored.

## Start verification

```json
{
  "subjectId": "00000000-0000-4000-8000-000000000000",
  "purpose": "employment-screening",
  "requestedSignals": ["GOVERNMENT_ID", "EMAIL_OWNERSHIP", "DEVICE_CONTEXT"],
  "signalInputs": {
    "deviceContext": {
      "browserFamily": "Chromium",
      "osFamily": "Windows",
      "deviceCategory": "desktop",
      "locale": "en-GB",
      "timezone": "Europe/Madrid"
    }
  }
}
```

The first response is HTTP 202. A same-key, same-body replay is HTTP 200 and includes `IDEMPOTENT_REPLAY_RETURNED`; a same-key, different-body request is HTTP 409.

Hopae additionally requires `signalInputs.hopae.workflowId`, `requestedAction`, and `requestedPurpose`. Session creation persists `INCONCLUSIVE` evidence until a signed callback and server retrieval complete.

## Confidence semantics

Only evidence with both `serverVerified: true` and `outcome: VERIFIED` contributes. No verified signals yields score 0 and `INSUFFICIENT_EVIDENCE`. One verified signal is `PROVISIONAL`. Multiple accepted verified signals may become `ESTABLISHED`; confidence never authorizes an action.

## Stripe Identity webhook boundary

Current qualification: implementation WORKING, session lifecycle and webhook IMPLEMENTED, real provider qualification BLOCKED_EXTERNAL, Production exercised NO. The [dated qualification record](../providers/STRIPE_IDENTITY_QUALIFICATION.md) records the owner-reported external account/business-setup blocker and distinguishes code tests from real provider proof.

`POST /api/stripe/identity/webhook` accepts `identity.verification_session.verified` and `identity.verification_session.requires_input`. It verifies the raw body with `Stripe-Signature` and the dedicated `STRIPE_IDENTITY_WEBHOOK_SECRET`. The billing destination and `STRIPE_WEBHOOK_SECRET` remain separate.

The destination supports the account owning `STRIPE_SECRET_KEY`; Connect and organization events are rejected. The key determines test/live mode. Before delivery, the session must already be linked through an `identity_provider_transactions` row (`stripe_identity`, `IDENTITY_ASSERTION`, `provider_session_id`) to an existing verification request. Authoritative session metadata must contain matching `enterprise_id` and `subject_id`; when present, `verification_request_id` must also match. Unknown or ambiguous links fail closed.

Both events retrieve the current VerificationSession without expanding verified outputs. The existing provider-neutral adapter normalizes that current status, so a stale event snapshot cannot supply a positive result. Only normalized evidence is appended to the linked request. No document images, selfies, raw biometric data, full payloads or provider error messages are persisted. The ledger retains a payload hash. Provider VERIFIED remains identity evidence: this callback neither finalizes a canonical decision nor grants ALLOW, and it does not refresh aggregate confidence.

Replay reservation uses the existing ledger under `stripe_identity`. Processed duplicates return 200 without a second fetch or write. Failed and in-progress entries return 503; the existing ledger has no safe automatic reclaim mechanism. These require operational reconciliation of the ledger and evidence before redelivery, rather than automatic reruns that might duplicate partial writes. Persistence failures never return success. No schema, API scope or deployment change is needed by this route.
