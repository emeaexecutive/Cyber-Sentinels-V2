# Cyber Sentinels API V1 customer error guide

The V1 API separates HTTP transport success from the canonical trust decision.

- A `200` or `201` decision response can contain `ALLOW`, `REVIEW`, or `DENY`. `REVIEW` and `DENY` are successful evaluations, not generic HTTP authorization failures.
- A non-2xx response means the API request was not completed. It is never an `ALLOW`.
- Preserve the safe `error.code`, `request_id`, and `correlation_id`. Do not log the API key or request content that may contain secrets.

## Corrective-action matrix

| Situation | HTTP / stable code | Retry? | Customer action |
| --- | --- | --- | --- |
| Missing API key | `401 AUTHENTICATION_REQUIRED` | No | Send `Authorization: Bearer <key>` from a server-side secret store. |
| Invalid or lost API key | `401 API_KEY_INVALID` | No | Check the selected environment and key value. A lost shown-once secret cannot be recovered; rotate it in **Developer -> API Keys**. |
| Revoked API key | `401 API_KEY_REVOKED` | No | Replace it with an active key. Do not reactivate or reuse the revoked secret. |
| Expired API key | `401 API_KEY_EXPIRED` | No | Create or rotate to a key with an acceptable expiry. |
| Inactive API key | `401 API_KEY_INACTIVE` | No | Use an active key or ask a tenant owner/admin to replace it. |
| Missing scope | `403 INSUFFICIENT_SCOPE` | No | Add only the scope named by the safe message, or use a correctly scoped client. |
| Bad JSON, wrong shape, or unknown field | `400 INVALID_REQUEST` | No | Correct the body against OpenAPI. Unknown fields are rejected. |
| Wrong content type | `415 INVALID_REQUEST` | No | Send `Content-Type: application/json` on mutation requests. |
| Body too large | `413 INVALID_REQUEST` | No | Reduce the payload to the documented route limit; do not send secrets or raw credentials. |
| Unknown or foreign agent | `404 AGENT_NOT_OWNED` or `404 RESOURCE_NOT_FOUND` | Usually no | Confirm the `agent_id`, API client, tenant, and environment. The API intentionally does not reveal whether a foreign resource exists. |
| No authority record | `404 AUTHORITY_NOT_FOUND` | No automatic retry | Stop execution. An authorized owner/admin API principal may grant bounded authority only after current identity proof and only within its persisted management boundary. |
| Authority expired, revoked, or outside scope | Decision response `DENY`, commonly with `AUTHORITY_SCOPE_INVALID` in `reason_codes` | Do not retry unchanged | Stop execution. Retrieve the receipt and Replay. Correcting a legitimate action requires an authority owner or a new in-scope request; never alter facts merely to obtain `ALLOW`. |
| More evidence or human judgment required | Decision response `REVIEW` | Do not execute or poll blindly | Stop execution and retain the receipt/Replay. Retrieve the governed review and let an authorized owner/admin/reviewer resolve it. Resolution never converts the original REVIEW into ALLOW; submit a new canonical evaluation. |
| Evidence digest mismatch | `400 EVIDENCE_DIGEST_MISMATCH` | No | Recompute the digest over the exact canonical assertion or omit the optional client digest. A client digest is not an authoritative server digest. |
| Reserved provider identity or evidence namespace | `403 PROVIDER_NAMESPACE_RESERVED` or `403 EVIDENCE_NOT_ACCEPTED` | No | Use `provider.key=self`, `class=APPLICATION_SIGNAL`, and a non-reserved assertion type. Verified provider evidence requires a separate authenticated provider integration. |
| Idempotency key reused with changed semantics | `409 IDEMPOTENCY_CONFLICT` | No with that key | Use the original unchanged request to replay the transaction, or a new random key for a genuinely different request. |
| Rate limited | `429 RATE_LIMITED` | Yes | Honor `Retry-After`, use bounded backoff, and do not vary correlation IDs to evade the per-tenant/per-client route-class limit. |
| Trust dependency or rate-limit enforcement unavailable | `503 READINESS_UNAVAILABLE` | Yes, bounded | Stop the protected action, retain the correlation ID, and retry with bounded backoff. Escalate after the customer-defined timeout budget. |
| Unexpected server failure | `500 INTERNAL_ERROR` | Maybe, bounded | Retry only if the operation is safe: use the same decision idempotency key and unchanged body. Escalate with correlation and request IDs. |
| DNS failure, connection refusal, or client timeout | No HTTP response | Maybe, bounded | Treat the result as unavailable, not approved. For a decision retry, reuse the same idempotency key and unchanged body. |

## Safe failure policy

`NO RESPONSE != ALLOW` and `TRUST SERVICE UNAVAILABLE != TRUST APPROVED`.

Cyber Sentinels does not choose the customer’s business-continuity policy. The integrating system must explicitly define its timeout budget, bounded retry schedule, operator escalation, and recovery path. It must never silently convert DNS failure, timeout, `429`, `500`, or `503` into an approval. For protected actions that require an authoritative trust evaluation, stop until a canonical decision is available.

## Idempotent retries

Decision requests require the same 8–120 character value in the `Idempotency-Key` header and body `idempotency_key` field. Generate a random, non-secret value per logical decision (for example, a UUID). After a timeout or transient server response, retry the unchanged semantic request with the same key. Same key plus same semantics returns the original canonical transaction; same key plus changed semantics returns `409 IDEMPOTENCY_CONFLICT`. Concurrent identical retries converge on the same logical transaction.
