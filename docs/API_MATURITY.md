# API Maturity RC5

## Audit scope

The RC5 inventory found 118 `app/api/**/route.ts` handlers. Most are authenticated application workflows and remain internal. The public inventory is centralized in `lib/api/public-endpoint-inventory.ts`; `lib/api/public-contracts.ts` provides its Next.js response adapter, and `/api-docs` renders the contract.

## Normalized public contract

Successful public reads expose `ok`, their documented data fields and metadata containing version, trace ID, audit ID and timestamp. Paginated routes also include limit, total and next cursor. Errors expose `ok: false`, a stable error code, a safe message and the same metadata.

## Public endpoint families

- liveness and bounded status;
- public verification, profile, seal and embed reads;
- sanitized feed and registry search;
- signed Hopae and ATS callbacks;
- rate-limited enterprise and waitlist intake, plus authenticated support intake.

Request schema, response schema, authentication, pagination and audit behavior are documented for every item on `/api-docs`.

## Duplicate removal

`/api/registry/search` previously duplicated search behavior across GET and POST. RC5 keeps the canonical GET query contract and removes the duplicate POST handler.

## Remaining work

Internal route families are not falsely represented as a stable public API. They require phased request validation, response/error normalization, API-key versioning and compatibility review before external publication. No mass rewrite was attempted because that would destabilize authenticated workflows.
