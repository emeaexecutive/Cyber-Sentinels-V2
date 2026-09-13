# V2 incident RPC revocation repair — 13 September 2026

The Production incident RPC failed with SQLSTATE 42703 because it referenced `api_keys.revoked`. Forward migration `20260913132642_fix_operational_incident_api_key_revocation_check.sql` removes only `and not coalesce(k.revoked,false)` from the complete existing function definition. It retains `status='active'`, `revoked_at is null`, tenant/client/key/scope/expiry checks, locks, ownership, evidence integrity, export binding, graph and Trust Memory writes, SECURITY DEFINER, fixed search_path and EXECUTE grants.

The applied historical migration `20260909163513_operational_incident_evidence_foundation.sql` is unchanged. Its SHA-256 is `dca46faece69edb14ad4b29281f6158101f55d2f2f4c3c3d2d8d7ce9eda8d242`.

## Actual column contract

| Environment | status | revoked_at | revoked |
| --- | --- | --- | --- |
| Production | PRESENT | PRESENT | ABSENT |
| Staging | PRESENT | PRESENT | PRESENT — legacy boolean |
| Historical local schema / captured Staging fixture | PRESENT | PRESENT | PRESENT — legacy boolean |

The requested assumption that `revoked` is absent everywhere is not supported by live inspection. The 202605260001 historical schema and captured Staging fixture include it. This schema difference masked the RPC defect. No column is added or removed from either remote environment.

`authentication.ts` selects `status` and `revoked_at` and delegates to `validateApiKeyRecord`, which rejects either revoked status or a populated revocation timestamp, rejects non-active status, and separately checks expiry/scopes. The owner/admin API creates active keys and revokes using `status='revoked'` plus `revoked_at`. CURRENT KEY LIFECYCLE CONTRACT = PASS.

## Invalid-reference audit

Repository-wide searches covered `k.revoked`, `.revoked,false`, `coalesce(k.revoked` and `api_keys.revoked`. References to the valid `k.revoked_at` identifier are not invalid `k.revoked` references.

| Match | Classification | Treatment |
| --- | --- | --- |
| `supabase/migrations/20260909163513_operational_incident_evidence_foundation.sql` | HISTORICAL MIGRATION; source of CURRENT FUNCTION | Preserved; superseded with the forward migration |
| Live `persist_operational_incident_v2` in Staging/Production | CURRENT FUNCTION | Replaced only through the new migration |
| `tests/operational-incident-revocation-migration.test.mjs` | TEST FIXTURE / regression assertion | Intentionally reproduces old failure and verifies corrected chain |
| `docs/v2/review-20260910/database-catalog.json` | DOC SNAPSHOT | Preserved |
| `docs/v2/production-qualification/same-client-20260913/database-diagnostic.json` | DOC SNAPSHOT | Preserved |
| `docs/v2/V2_PRODUCTION_PROOF.md` | DOC SNAPSHOT / proof chronology | Failure retained; new result appended |
| New repair documentation and before-snapshots | DOC SNAPSHOT | Retains the exact defect as diagnostic evidence |
| Runtime TypeScript application source | RUNTIME SOURCE | No invalid reference found; unchanged |

The local migration harness now applies the forward repair against the Production column shape. The captured historical Staging fixture itself remains unchanged.

## Regression verification

The new test executes the actual historical and repaired RPC in PGlite 0.5.8, pinned as a development dependency. It first reproduces 42703 without `revoked`, then checks successful active-key creation/memory writes, both revocation indicators separately and together, expiry, missing incident scope, wrong tenant/client/key, unchanged transaction actor isolation, and RPC grants. A structural comparison proves the replacement function differs only in the requested predicate. The final migration definition does not require the legacy column.

Focused migration test: 12 passed. The new suite is included in `npm run test:v2-incidents` and therefore `npm test`/CI.

Execution evidence is stored under `docs/v2/production-qualification/rpc-repair-20260913/`. Qualification progress and the final release outcome are recorded in `V2_PRODUCTION_PROOF.md`.
