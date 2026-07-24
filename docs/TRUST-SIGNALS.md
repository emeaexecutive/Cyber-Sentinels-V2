# Trust Signals

## Normalized schema

`TrustSignal` is immutable and includes:

| Field | Contract |
| --- | --- |
| `id` | UUID; generated when omitted |
| `tenantId` | Derived from authenticated workspace, never trusted from the request |
| `entityId` / `entityType` | Existing tenant subject and tightly validated entity union |
| `signalType` | One of the 21 supported categories |
| `source` / `provider` | Normalized references; provider/system sources require a server integration |
| `observedAt` / `receivedAt` | ISO timestamps; at most five minutes of future skew |
| `severity` | `INFORMATIONAL`, `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` |
| `confidence` | Numeric value from 0 through 1 |
| `status` | `POSITIVE`, `NEGATIVE`, `INCONCLUSIVE`, `UNAVAILABLE`, `REVOKED`, or `INFORMATIONAL` |
| `fingerprint` | SHA-256 of canonical normalized facts |
| `correlationId` / `causationId` | Trace identifiers |
| `metadata` | Bounded primitives only |
| `createdAt` | Server-normalized receipt time |

Categories are Identity, Document, Email, Phone, Device, Session, Browser, Network, VPN, Location, Behaviour, Liveness, Deepfake, Provider, Enterprise Policy, Manual Review, AI Agent, Authority, Credential, Integration, and System.

## Ingestion example

```http
POST /api/trust/signals
Idempotency-Key: device-human-alice-0001
Content-Type: application/json

{
  "entityId": "human:alice",
  "entityType": "HUMAN",
  "signalType": "DEVICE",
  "source": "review:operations",
  "observedAt": "2026-07-24T10:00:00.000Z",
  "severity": "HIGH",
  "confidence": 0.91,
  "status": "NEGATIVE",
  "metadata": {
    "changeType": "NEW_DEVICE",
    "previousScore": 92,
    "currentScore": 70
  }
}
```

Success returns `signalId`, `status`, `acceptedAt`, `duplicate`, and `processingStatus`. Reusing the same source/idempotency key and fingerprint returns the original signal. Reusing it for different facts returns `409`.

## Source authorization

Ordinary authenticated users cannot submit provider or system signals. Observers cannot ingest. Reviewers can submit only manual-review and identity-document-contact categories. Signed provider endpoints and trusted server integrations remain responsible for authenticating provider facts before normalization.

A positive human-authorized signal is projected as `INCONCLUSIVE` context and cannot raise the canonical trust score. Positive trust evidence must continue to arrive through an existing signed/server-verified provider path. Authorized negative, revoked, and unavailable signals may reduce or challenge trust because those operations are auditable and fail closed.

## Metadata and personal data

Metadata allows at most 40 fields. Arrays allow at most 20 primitive values and strings are bounded. Nested objects are rejected. Known secret, token, password, raw payload, biometric, document-image, precise-location, latitude/longitude, full-IP, and prompt keys are rejected in both TypeScript and SQL.

Entity references and timestamps are personal data where they relate to a person. They are retained as audit facts. Sensitive source evidence belongs in an approved evidence store; only normalized references and outcome facts belong in signals. The evidence projection has a 365-day retention boundary, subject to the platform's higher-level retention and legal-hold controls.

## Failure responses

Malformed and unauthorized attempts return a stable safe error code. A privacy-minimized `runtime.trust_signal.rejected` event is appended to Replay with only the disposition and error code; rejected raw content is not persisted.
