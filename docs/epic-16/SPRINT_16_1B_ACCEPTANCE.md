# Sprint 16.1B acceptance

## Source acceptance

- [x] Coherent server-side PAL and typed error taxonomy.
- [x] Hopae implements the common adapter contract.
- [x] Provider selection and Hopae eID selection are server controlled.
- [x] Exact raw-body HMAC verification, timestamp tolerance, digest, replay key, and idempotent duplicate handling.
- [x] Deterministic normalized evidence; unknown status never maps to `PASSED`.
- [x] No raw identity payload persistence in the Sprint 16.1B schema.
- [x] Atomic normalized evidence plus existing Replay, Evidence Graph, Trust Memory, receipt, and Trust Decision persistence.
- [x] ORI remains downstream of the authoritative Trust Decision and consumes normalized context only.
- [x] Tenant-scoped reads and service-role-only writes/admin mutation in migration and tests.
- [x] Existing provider API and admin surfaces reused.
- [x] Mocked/unit, static RLS, lint, typecheck, full tests, and build coverage.

## Deployment acceptance still required

- [ ] Apply migration `202607170002_provider_abstraction_hopae.sql` in the target environment.
- [ ] Configure approved Hopae sandbox credentials, eID provider, callback secret, and callback URL.
- [ ] Audit-enable `hopae_connect` in `provider_registry`.
- [ ] Run `RUN_HOPAE_LIVE_TESTS=true npm run test:hopae-live` with an approved Hopae test eID only.
- [ ] Prove a real signed callback, duplicate delivery, invalid signature, replay rejection, evidence linkage, degraded behavior, and rollback.
- [ ] Run live RLS denial tests with revoked-user and cross-tenant fixtures.

Deployment recommendation: **blocked pending target-environment evidence**. Source implementation is release-candidate ready; production readiness is not claimed.

## Final local verification

- `npm run lint`: passed with 0 errors and 6 pre-existing warnings.
- `npm run typecheck`: passed.
- `npm run test:providers`: 3 passed.
- `npm run test:hopae`: 9 passed.
- `npm run test:provider-rls`: 6 passed.
- `npm run test:ml-validation`: 13 passed.
- `npm run test:ori`: 18 passed.
- `npm run test:rc6`: 8 passed.
- `npm test`: passed the complete repository suite after updating the RC4 truth-state assertion for the new pre-callback `Test Mode` boundary.
- `npm run build`: passed; 154 static pages generated.
- `npm run test:rls`: safely blocked by its explicit `RUN_RLS_TESTS=true` deployment gate.
- `npm run test:hopae-live`: not run because credentials and explicit opt-in were absent.
