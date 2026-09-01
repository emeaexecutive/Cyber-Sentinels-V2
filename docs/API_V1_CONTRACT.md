# Cyber Sentinels public API V1 contract

Status: release-candidate freeze. URL version: `/api/v1`. Contract metadata: `2026-08-29`.

The executable source of truth is `GET /api/v1/openapi.json`, generated from `lib/public-api/v1/openapi.ts`. This document is the classification and operational companion; internal dashboard routes are not public merely because they use HTTP.

## What V1 does

Cyber Sentinels sits between a customer system proposing an agent action and the customer-controlled executor. An **Agent** is the tenant- and API-client-bound operational identity being evaluated. **Authority** is the separately represented, versioned boundary describing which actions, targets, tools, environments, purpose, and lifetime may be considered. A **Receipt** is the minimized projection of one persisted canonical decision. **Replay** is the ordered canonical transaction chronology behind that decision.

Cyber Sentinels authenticates the API client, verifies agent-key possession, resolves current authority and policy, returns `ALLOW`, `REVIEW`, or `DENY`, and preserves canonical decision evidence. It does not execute the action, directly control the downstream system, replace IAM/KYC/firewalls, create independent proof from a customer assertion, or certify regulatory compliance.

`IDENTITY != AUTHORITY` and `VERIFIED != AUTHORIZED`. Identity proof establishes possession of the registered Ed25519 key; it does not by itself authorize an action.

## Common contract

- Authentication: `Authorization: Bearer <API key>`. Keys use the existing `cs_test_<id>.<secret>` or `cs_live_<id>.<secret>` format, are shown once, and only a salted scrypt hash and safe prefix are stored.
- Binding: authentication resolves `tenant_id`, `client_id`, key lifecycle, and scopes server-side. Every agent and transaction lookup also filters by the authenticated tenant; agent operations additionally require the `public_api_agent_bindings` client binding.
- JSON: mutation bodies require `Content-Type: application/json`. Unknown fields are rejected. Limits are 1 KiB for challenge, 16 KiB for agent/credential/decision/outcome, 32 KiB for proof, and 64 KiB for manifest/evidence.
- Successful object responses are unwrapped for V1 compatibility and include `request_id`, `correlation_id`, and `api_version`. Resource creation also returns its stable identifier and creation/domain timestamp where the canonical resource supplies one.
- Every response sends `X-Request-Id`, `X-Correlation-Id`, `X-Cyber-Sentinels-Api-Version`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`. Authenticated API data is not shared-cacheable.
- `X-Correlation-Id` may be supplied as a UUID and joins the request, canonical transaction, decision, evidence references, receipt, and Replay. It is never an authorization mechanism.
- No authenticated cross-origin browser contract is declared. There is no wildcard CORS behavior. Unsupported methods are rejected by the route runtime; public mutation routes do not expose an unauthenticated CORS preflight grant.

## Endpoint inventory

All operations below are `V1_PUBLIC`. There are no `DEPRECATED` or `NOT_READY` operations under `/api/v1`. `/api/developer/api-keys` is `INTERNAL` session-authenticated dashboard administration. `/api/health` and `/api/ready` are public operational probes, not customer trust operations.

| Method and path | Scope | Request schema | Success and response schema | Rate class |
| --- | --- | --- | --- | --- |
| `POST /api/v1/agents` | `agents:write` | `display_name`, `entity_type=AI_AGENT`, `owner_reference`, `runtime{environment,framework}`, `model{provider,identifier}` | `201`; `agent_id`, `operational_entity_id`, `status`, `next_step`, `manifest_context` | registration 20/min |
| `GET /api/v1/agents/{agentId}` | `authority:read` | path `agentId` | `200`; safe agent identity, lifecycle and authority references | read 240/min |
| `POST /api/v1/agents/{agentId}/credentials` | `agents:write` | `public_jwk`, `kid`, `algorithm`; optional `expires_at`, `rotate_from_credential_id` | `201`; `credential_id`, `kid`, algorithm, fingerprint, status, `private_key_stored=false` | registration 20/min |
| `POST /api/v1/agents/{agentId}/manifest` | `agents:write` | signed Manifest 1.0 fields defined by `SignedManifest` | `201`; `manifest_id`, digest, status, declared/verified/derived classification | registration 20/min |
| `POST /api/v1/agents/{agentId}/challenge` | `agents:verify` | empty JSON object | `201`; short-lived challenge, nonce, audience, manifest/key binding and timestamps | challenge 30/min |
| `POST /api/v1/agents/{agentId}/proof` | `agents:verify` | `challenge_id`, `credential_id`, signature and bound `signed_payload` | `200`; identity result, verification/evidence references, continuity and reason codes | proof 30/min |
| `GET /api/v1/agents/{agentId}/authority` | `authority:read` | path `agentId` | `200`; status, allowed actions/targets/tools/environments, expiry and authority lineage identifiers | read 240/min |
| `GET /api/v1/agents/{agentId}/authorities` | `authority:read` | path `agentId` | `200`; immutable authority-version history for the client-bound agent | read 240/min |
| `POST /api/v1/agents/{agentId}/authorities` | `authority:write` | bounded action, target, tool, environment, purpose and validity fields | `201`; new immutable authority identifier/version and supersession lineage | authority 30/min |
| `GET /api/v1/agents/{agentId}/authorities/{authorityId}` | `authority:read` | path `agentId` and `authorityId` | `200`; one immutable authority version for the client-bound agent | read 240/min |
| `POST /api/v1/agents/{agentId}/authorities/{authorityId}/revoke` | `authority:write` | revocation reason and optional evidence references | `200`; monotonic revocation state and preserved authority lineage | authority 30/min |
| `GET /api/v1/agents/{agentId}/trust-state` | `authority:read` | path `agentId` | `200`; identity, authority, continuity, health, drift, confidence, stability, restrictions and last material change | read 240/min |
| `POST /api/v1/trust/decisions` | `trust:request` | `DecisionRequest`; matching `Idempotency-Key` header and body value required | `201` created or `200` replay; canonical `Decision` | decision 60/min |
| `GET /api/v1/reviews/{reviewReference}` | `review:read` | path `reviewReference` | `200`; same-tenant/client governed review linked to the original canonical `REVIEW` | read 240/min |
| `POST /api/v1/reviews/{reviewReference}/resolve` | `review:write` | terminal resolution, rationale and optional evidence references | `200`; immutable resolution record; original decision remains `REVIEW` | review 30/min |
| `POST /api/v1/evidence` | `evidence:write` | `EvidenceRequest`; provider must be `self/APPLICATION_SIGNAL` and subject must be client-owned | `201`; evidence identifier, digest and immutable `AGENT_ASSERTED`/`INCONCLUSIVE` classification | evidence 120/min |
| `GET /api/v1/trust/transactions/{transactionId}` | `trust:read` | UUID path identifier | `200`; sanitized canonical transaction with decision, action, authority, evidence, outcome, timestamps and digests | read 240/min |
| `GET /api/v1/trust/transactions/{transactionId}/receipt` | `trust:read` | UUID path identifier | `200`; canonical minimized receipt; attachment filename is safe and transaction-derived | read 240/min |
| `GET /api/v1/trust/transactions/{transactionId}/replay` | `trust:read` | UUID path identifier | `200`; canonical chronological events and stable receipt/decision/agent references | read 240/min |
| `POST /api/v1/trust/transactions/{transactionId}/outcomes` | `outcomes:write` | `source_id`, destination, action/target, result, observed time and evidence reference; optional digest | `201`; submission identifier, duplicate state, digest and `AGENT_ASSERTED` independence | outcome 60/min |
| `GET /api/v1/openapi.json` | none | no body | `200`; OpenAPI 3.1 contract | static documentation |

The exact nested field constraints, examples and response types are in OpenAPI. No internal dashboard, provider callback, webhook administration, or trust-fabric administration route is part of V1.

## Decision response and identifiers

The decision vocabulary is exactly `ALLOW`, `REVIEW`, or `DENY`. A decision response prominently returns `decision_id`, `transaction_id`, `decision`, `reason_codes`, `agent_id`, `authority_reference`, `authority_version`, `policy_reference`, `policy_version`, `receipt_id`, `receipt_url`, `replay_id`, `replay_url`, `correlation_id`, and `created_at`.

- `agent_id`: canonical operational entity identifier; opaque possession grants no access.
- `transaction_id`: canonical UUID and authorization root for transaction projections.
- `decision_id`: canonical decision reference.
- `receipt_id` and `replay_id`: stable V1 projections equal to the canonical `transaction_id`; they do not create parallel stores.
- `evidence_id`: deterministic tenant/client/event/subject projection stored in the existing canonical evidence ledger.

All reads reapply authenticated tenant context. Foreign or guessed agent/transaction/receipt/Replay identifiers return a caller-safe 404-class response; this is the intentional compatibility/security exception to using 403 for known-but-forbidden resources.

## Consequence-time authorization

Authority is not a permanent fact. It is a continuously evaluated state. The public decision path keeps these questions separate:

- **Identity:** who or what is acting?
- **Authority:** what does the server-resolved current authority permit?
- **Intent:** what exact action, target, purpose, and environment are requested?
- **Current conditions:** what relevant authority, policy, evidence, runtime, destination, propagation, approval, and freshness facts are known now?
- **Consequence:** what would proceeding affect?
- **Decision:** does current authority justify this exact consequential action now?

`VALID_AUTHORITY_AT_T1 != AUTOMATIC_PERMISSION_AT_T2` and `PREVIOUS_ALLOW != STANDING_AUTHORIZATION`. An `ALLOW` is valid only for its exact transaction and decision-time context. A later action requires a new decision request and new idempotency key. `context.previous_transaction_id` may link an earlier same-client/same-agent transaction for historical comparison, but it cannot supply positive eligibility. The T1 result remains historically valid; a different T2 result reflects newly evaluated conditions and does not rewrite T1.

The optional structured context supports `intent_reference`, `previous_transaction_id`, expected `authority_version` and `policy_version`, `current_evidence_references`, `material_change_references`, and `human_approval_reference`. These are safe references or optimistic pins, not trusted assertions. The server resolves them against existing tenant-scoped authority, policy, evidence, review, runtime, and destination records. An unresolved reference or an `AGENT_ASSERTED` claim can require `REVIEW`, but it cannot restore `ALLOW` eligibility.

Every canonical response includes `consequence_time`. The same immutable action-time projection feeds the existing transaction snapshot, receipt, Replay, Evidence Graph, and Trust Memory; it does not create a second evaluator or store.

## Authority model in the V1 onboarding flow

Registering through `POST /api/v1/agents` creates identity state only and grants no business authority. After current Ed25519 identity proof, an owner/admin API principal with `authority:write` and the server-persisted authority-management boundary may create a bounded, expiring Trust Contract version through `POST /api/v1/agents/{agentId}/authorities`. V1 authority versions are immutable; a later grant supersedes rather than rewrites the previous version, and revocation is monotonic.

An authority becomes usable only while current native identity proof exists and the authority itself remains active. `GET /api/v1/agents/{agentId}/authority` reads the server-resolved newest contract and returns `ACTIVE`, `PENDING_IDENTITY`, `SCHEDULED`, `EXPIRED`, or `REVOKED`, plus its exact action, targets, tools, environments, reference, version, expiry, and lineage fields.

Decision clients do not send `authority_reference`. The server resolves current authority for `operational_entity_id`; caller-supplied authority, verification, trust-state, score, or decision claims are rejected. If no authority record exists, the read returns `404 AUTHORITY_NOT_FOUND`. An expired, revoked, or out-of-scope boundary normally produces a successful canonical `DENY`, not a generic HTTP 403.

The decision client still never imports or chooses `authority_reference`; authority grants and revocations use their dedicated governed routes, and the canonical evaluator independently resolves the current version at action time.

## ALLOW, REVIEW, and DENY

- `ALLOW` authorizes only the exact evaluated agent, action, target, purpose, environment, authority version, and policy version. It is not proof that execution occurred.
- `REVIEW` means the canonical evaluator could not issue execution authorization without further evidence or human judgment. `review_required` and `human_approval_required` are true, `execution_authorization` is null, and the caller must stop. A governed review resolution is subsequent evidence and never rewrites the original `REVIEW`; even `APPROVED` requires a new canonical decision request under current conditions.
- `DENY` is a completed canonical evaluation that found a boundary failure. The caller must stop, inspect `reason_codes`, and retrieve the receipt and Replay. A changed legitimate request requires a new idempotency key; the same key is reserved for an unchanged retry.

HTTP success and trust success are different axes. A `200`/`201` decision response may be `ALLOW`, `REVIEW`, or `DENY`. A non-2xx response means no canonical approval was returned and must never be converted to `ALLOW`.

## Receipt and Replay semantics

The consequence-time receipt fields preserve the decision-time authority version, current-condition references, material-change references, exact intent, evidence freshness, approval state, consequence, decision, reason codes, policy/version, transaction identifiers, and digest. The receipt does not prove downstream execution unless separate independent outcome evidence exists.

Replay exposes the same frozen consequence-time projection plus the referenced prior evaluation, changed conditions, whether the decision differs, and any separately retained outcome observations. It answers what authority existed and when it was granted, what changed, what was known and fresh, and why T2 differed from T1 without storing chain-of-thought or rewriting the earlier decision.

The receipt proves what Cyber Sentinels persisted as the canonical decision for the referenced transaction: identity/agent reference, exact action, authority lineage, policy/version, reason codes, evidence references, continuity state, and decision digest. It does not prove that the downstream action executed, that client assertions are independently true, or that the customer is compliant. V1 receipts are digested projections; no receipt signature or regulatory certification is advertised. Store or reference them under the customer’s evidence-retention policy without adding secrets.

Replay returns canonical transaction events ordered by `occurred_at`, with stable decision, transaction, receipt, agent, authority, policy, evidence, and record-digest references. Every event from this endpoint has source `canonical_trust_transaction`. Public V1 cannot create a Replay/session record, so customer-created logs or outcome assertions must not be presented as canonical Replay events. Replay explains retained chronology; it does not replace source evidence or invent missing events.

The public material does not publish a retention duration, deletion guarantee, or independently signed receipt format. Buyers requiring those commitments must obtain them through an approved contractual/security-review process.

## Errors and HTTP status

The body is `{ error: { code, message, correlation_id }, request_id, correlation_id, api_version }`. Unexpected errors become `INTERNAL_ERROR`; SQL, Supabase details, stack traces, service-role configuration, secret names, provider credentials, and implementation paths are not returned.

Stable V1 codes include `AUTHENTICATION_REQUIRED`, `API_KEY_INVALID`, `API_KEY_EXPIRED`, `API_KEY_REVOKED`, `INSUFFICIENT_SCOPE`, `INVALID_REQUEST`, `RESOURCE_NOT_FOUND`, `AGENT_NOT_OWNED`, `AUTHORITY_NOT_FOUND`, `AUTHORITY_SCOPE_INVALID`, `EVIDENCE_NOT_ACCEPTED`, `EVIDENCE_DIGEST_MISMATCH`, `PROVIDER_NAMESPACE_RESERVED`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `TENANT_ACCESS_DENIED`, `READINESS_UNAVAILABLE`, and `INTERNAL_ERROR`. More specific existing domain codes remain additive compatibility codes.

Statuses are `200` retrieval/evaluation/replay, `201` creation, `400` invalid request, `401` missing/invalid/expired/revoked authentication, `403` valid principal lacking scope or allowed provenance, `404` unavailable resource, `409` idempotency/lifecycle conflict, `413` too large, `415` wrong content type, `422` reserved for established semantic validation, `429` rate limited, `500` unexpected failure, and `503` required data-plane/auth/rate-limit dependency unavailable.

See [`API_V1_CUSTOMER_ERROR_GUIDE.md`](API_V1_CUSTOMER_ERROR_GUIDE.md) for retryability and corrective action, including the required distinction between canonical `DENY`/`REVIEW` and HTTP failures.

## Idempotency and rate limits

Decision idempotency is `(tenant, API client, Idempotency-Key)`. The key must match the request body. The semantic digest includes agent, normalized action, decision type, and context. Same client/key/semantic request returns the same canonical transaction; changed sequential or concurrent reuse returns `IDEMPOTENCY_CONFLICT`. Database uniqueness arbitrates concurrent duplicates and the losing request rechecks semantic equivalence before replay.

Rate limiting is an atomic database upsert keyed by `(tenant_id, client_id, route_class, window_started_at)`. Correlation IDs do not participate and cannot bypass it. Successful authenticated responses expose `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`; 429 also exposes `Retry-After`. Limits are configuration constants in `lib/public-api/v1/handler.ts`; changing them is a reviewed release change.

## Versioning and compatibility

`/api/v1` is the breaking-change boundary. `X-Cyber-Sentinels-Api-Version: 2026-08-29` and body `api_version` date-pin the compatible contract. It is response metadata, not a request-time selector. Breaking changes require a new URL major version; V2 is not implemented. Additive V1 changes may advance the date. Deprecated operations must be marked in OpenAPI before removal.

V1 intentionally preserves unwrapped success objects and the established scope names (`trust:request`, `trust:read`, `agents:verify`) instead of introducing stylistic renames or a second response architecture.

## Readiness

`GET /api/health` reports liveness and safe release SHA metadata. `GET /api/ready` checks required environment and the authoritative trust-domain registry through the service data plane. Missing configuration, migration, registry state, or dependency access returns `503`; readiness does not expose credentials or project secrets.

## Production and shared responsibility

Test keys use the `cs_test_` prefix and live keys use `cs_live_`. The approved base URL is supplied during environment onboarding; do not infer a Preview or Production hostname from a key prefix. Before Production, prove agent isolation, current identity and authority, ALLOW/REVIEW/DENY handling, idempotent timeout retry, receipt/Replay retrieval, 429 handling, and fail-safe behavior in the approved non-Production environment. Current route-class limits are documented configuration, not a permanent commercial promise.

The canonical Production origin advertised by OpenAPI is `https://www.cybersentinels.com`. Do not use the redirecting apex origin for Bearer-authenticated API calls. Non-Production origins must be supplied explicitly.

Cyber Sentinels is responsible for API authentication enforcement, tenant/client isolation, the canonical Trust Fabric decision, canonical evidence persistence, receipt/Replay access control, server-side evidence classification, and provider-neutrality boundaries. The customer is responsible for protecting and rotating API keys, mapping its real agent identity correctly, providing only legitimate references and context, honoring `DENY` and `REVIEW`, not treating `AGENT_ASSERTED` evidence as independent proof, protecting the downstream executor, and operating an appropriate human-review/escalation process.

For DNS failure, connection timeout, `429`, `500`, or `503`, apply bounded retries and the customer-defined escalation policy. `NO RESPONSE != ALLOW` and `TRUST SERVICE UNAVAILABLE != TRUST APPROVED`. For a timed-out decision, reuse the same idempotency key with the unchanged semantic request.
