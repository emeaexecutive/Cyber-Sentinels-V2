# API standards

## Status

This document establishes the standard for new or materially changed endpoints while recording current exceptions. It does not retroactively claim that the 118 existing route files conform.

## Boundary order

Every handler must apply the relevant sequence:

1. identify the access mode: public, session, admin, API key or signed webhook;
2. authenticate credentials and derive tenant/actor server-side;
3. enforce authorization before data access or external calls;
4. enforce content type, body size and rate limit;
5. validate path, query and body through a typed boundary;
6. delegate domain work to an existing canonical service;
7. persist through a scoped client/repository and RLS;
8. return a sanitized response; and
9. emit audit/replay evidence for consequential actions.

## Versioning

No URL-versioned API (`/api/v1`) exists. Some payloads include `schemaVersion`, but use is inconsistent. Until an approved versioning ADR changes this:

- additive optional fields may be introduced without a route version change;
- breaking request, response, authorization or semantic changes require a new ADR and explicit migration path;
- stable public/partner contracts must include `schemaVersion` in JSON;
- deprecated fields require an announced compatibility window and consumer evidence; and
- internal handlers must not be presented as stable public APIs merely because they use `/api`.

## Naming

- Use lowercase kebab-case route segments and plural resource nouns where a resource collection exists.
- Use `[id]` only for validated opaque identifiers; never interpolate it into SQL or external URLs.
- Prefer HTTP methods for CRUD semantics instead of action words, except auditable commands such as `/review` or `/execute`.
- JSON fields use `camelCase` for new external contracts unless preserving an established snake_case trust/evidence schema. Do not mix styles inside one contract.

Existing routes use mixed resource/action naming and mixed field casing; migration must be incremental.

## Success schema

New JSON contracts should use:

```json
{
  "ok": true,
  "schemaVersion": 1,
  "data": {},
  "meta": {
    "requestId": "opaque-reference"
  }
}
```

Do not wrap redirects, file exports, webhooks acknowledgements or standards-mandated payloads merely for uniformity. Never include secrets, raw provider payloads or service-role errors.

## Error schema

New JSON errors should use stable machine codes:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "error": {
    "code": "invalid_request",
    "message": "Request validation failed.",
    "requestId": "opaque-reference",
    "details": []
  }
}
```

Use 400 invalid input, 401 unauthenticated/invalid credential, 403 authenticated but forbidden, 404 absent scoped resource, 409 state/idempotency conflict, 413 body too large, 415 unsupported media type, 422 semantically invalid provider event, 429 rate limited, 500 unexpected internal failure, 502 upstream invalid/failure and 503 safely unavailable/misconfigured dependency.

Current handlers return multiple error shapes and redirects. Preserve existing clients until a versioned migration is approved.

## Pagination

No common pagination contract is implemented. New list endpoints must use bounded cursor pagination:

- `limit` defaults to 25 and must not exceed 100;
- `cursor` is opaque and scoped to the same filter/sort contract;
- responses return `nextCursor` or null and `hasMore`;
- never expose total counts unless the query is bounded and authorized; and
- offset pagination is acceptable only for small admin-only datasets with a documented bound.

## Filtering and sorting

- Allowlist filter fields and operators; reject unknown fields.
- Derive tenant/owner filters from authorization, never the body or query alone.
- Allowlist sort keys and direction.
- Use a deterministic secondary key, normally ID, for stable pagination.
- Bound search length and escape/provider-parameterize database patterns.

Existing query endpoints implement local parsing and do not share a filter/sort contract.

## Rate limiting and abuse resistance

Rate limits must be identity/API-key and route scoped, fail predictably with 429, and include retry guidance without revealing internal capacity. Public mutation endpoints also require bot protection when appropriate. Signed webhooks require timestamp tolerance, body limits and idempotency.

The current `checkRequestRateLimit` coverage is endpoint-specific and process-local. No distributed/global rate-limit store or edge gateway policy is evidenced in source; do not describe current limits as fleet-wide protection.

## Authorization standards

- Public routes must be explicitly documented public and return only public-safe data.
- Session routes validate the user server-side.
- Admin routes require allowlist and verification-cookie checks in addition to middleware defense in depth.
- Partner APIs require scoped, rotatable keys; `TRUST_API_KEY` is a transitional single-key mechanism.
- Webhooks verify the exact raw body before parsing and use an idempotency ledger.
- RLS is mandatory for browser/authenticated database access; service-role use must be minimal and server-only.

## Validation and observability

Typed validation must bound strings, arrays, numeric ranges, enums, files and body size. Logs use safe references and request IDs; they must not contain credentials, raw identity evidence or prohibited payloads. Consequential decisions record actor, tenant, policy/version, evidence references, outcome and replay linkage.
