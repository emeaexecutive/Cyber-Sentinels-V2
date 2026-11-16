# Customer workload identity — PR A

## Status

**Local implementation; hosted qualification blocked.** This change does not configure an issuer, enroll a workload at an external identity provider, or establish that a customer's token can reach a hosted environment.

## Contract

1. A tenant owner or administrator uses an existing `agents:write` API key to bind one OIDC subject to an already registered agent. The service derives issuer and audience from pinned server configuration; callers cannot select them.
2. The workload requests a token from that issuer. Requests are accepted only when the configured issuer, audience, HTTPS JWKS signature, allowed signing algorithm, `exp`, `iat`, `jti`, tenant, workload ID, subject, and scope all validate.
3. Issuer/subject/tenant/workload must match one active, unexpired database binding. The binding creator must still be a current tenant owner/admin.
4. The only initial workload scope is `trust:request`. A workload can request a decision only for the agent encoded in the token and URL. Current authority is re-evaluated by the existing canonical decision path.
5. Binding revocation and expiry fail closed. No workload token can register agents, change policy, grant authority, approve REVIEW, or dispatch a customer action.

Configure these server-only variables in the non-production environment:

```text
WORKLOAD_OIDC_ISSUER=https://<approved-issuer>/<tenant-or-realm>
WORKLOAD_OIDC_AUDIENCE=https://<approved-api-audience>
WORKLOAD_OIDC_JWKS_URL=https://<approved-issuer>/<pinned-jwks-path>
```

Use the exact issuer value published by the approved issuer. The service accepts only HTTPS, rejects URL credentials/query/fragment, pins JWKS to configuration rather than token fields, restricts algorithms to EdDSA, ES256, and RS256, and caps JWT lifetime at five minutes. Do not copy tokens or secrets to logs or source control.

## API

- `POST /api/v1/agents/{agentId}/workload-bindings` — owner/admin, `agents:write`; accepts `subject`, the sole scope `trust:request`, and an expiry no more than 90 days away.
- `GET /api/v1/agents/{agentId}/workload-bindings` — owner/admin, `agents:write`.
- `POST /api/v1/agents/{agentId}/workload-bindings/{bindingId}/revoke` — owner/admin, `agents:write`.
- `POST /api/v1/workloads/{agentId}/decisions` — OIDC bearer; requires `tenant_id`, `workload_id`, `scope`, `jti`, and the standard JWT claims. Supply an `Idempotency-Key`; the body must not contain `operational_entity_id`.

The database binding table is service-role-only, tenant-scoped, references the existing tenant-owned agent binding, permits one active workload per agent, and prevents an active issuer/subject from being bound twice.

## Tests and acceptance

- Real signature verification with a test Ed25519 JWKS; reject forged signatures, unsupported algorithms, wrong issuer/audience, missing/invalid tenant or workload claims, stale/overlong tokens, malformed JTI, unsupported scope, missing configuration, and unpinned URLs.
- Route contract and migration checks cover tenant/agent/issuer/subject binding, current owner status, scope narrowing, revocation, agent-ID derivation, row-level security, and service-role-only table access.
- Hosted qualification additionally requires a customer-approved non-production issuer/JWKS/audience, real test subject, two-tenant negative tests, token expiry and revocation tests, rate-limit/audit evidence, and authority-change revalidation against an approved non-production database.

## Threat assumptions and residual risks

- Issuer/JWKS/audience environment configuration and Supabase service-role access are trusted operator controls. A compromised issuer or service role can impersonate workloads.
- JWTs are bearer credentials. TLS, short expiry, secret-safe client handling, issuer-side revocation, and workload registration revocation remain operational requirements.
- A valid token proves identity binding, not permission to perform an action. The existing tenant agent binding and canonical authority/policy decision remain mandatory.
- This PR is not an execution adapter, provider credential, durable signing-key service, or customer production qualification.

## Next PR dependency order

- **PR B — HubSpot sandbox enforcement:** depends on this binding for workload identity and on an approved HubSpot developer account, scoped OAuth app, synthetic contact allowlist, and external-provider access. Prove provider-side ALLOW effect; zero provider calls for DENY, unresolved REVIEW, revoked authority, or replay; and safe reconciliation after uncertain outcomes.
- **PR C — durable signing trust:** depends on stable workload/tenant identity and provider receipts from PRs A/B. Deliver a provider-neutral Ed25519 signer/verifier, KID and rotation/public-key discovery contracts, tamper detection and offline verification. Hosted qualification additionally requires the owner to select and authorize a managed service confirmed to support non-exportable Ed25519 signing.

## Release gate

Do not deploy the migration or enable OIDC workload traffic until the identity owner supplies the approved non-production issuer, exact audience/JWKS values through the secrets/configuration system, and a test workload subject. CI passing locally is not hosted qualification. No production deployment or real customer record is in scope.
