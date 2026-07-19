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
