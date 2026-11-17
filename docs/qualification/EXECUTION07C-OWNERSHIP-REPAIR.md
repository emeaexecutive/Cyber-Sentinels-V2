# Execution 07C ownership repair

Local review branch only, based on approved Core `8ce430413a1bad379c32c06f205e8affd516b3eb`. No approved candidate head is changed. Hosted SQL and migrations remain prohibited; Production is NO-GO.

The original 120 synthetic PostgreSQL cases reproduced 20 unintended authorizations: an approved active user with missing/empty email could match absent/empty record ownership through case/passport, evidence delegation, team membership and agent helpers. The four-function prototype alone also leaves twenty direct RLS email comparisons in the saved Staging schema. Their property grid reproduced 104 additional unintended results. A tab-only identity exposed a further gap in a simple space-only `btrim` guard; that failed attempt was retained before the final repair.

## Minimal repair scope

- Add non-exposed, SECURITY INVOKER `session_security.current_ownership_email()`. It returns NULL for missing UID, inactive/unapproved session or a missing/empty/all-POSIX-whitespace email. Otherwise it returns `lower(original email)`; nonblank padded claims are not trimmed or newly matched.
- Route four existing owner functions and all twenty captured direct RLS comparisons through that helper. Preserve their UID/workspace/team alternatives, signatures, SECURITY DEFINER settings, pinned search_path, policy command/mode/roles, and existing function/table grants.
- Guard each function signature/body and each policy name, role, command and original expression. Refuse drift or an unreviewed direct JWT-email policy rather than overwriting it. Serialize migration attempts and retain transaction/lock/statement limits. The forward migration is repeatable in the tested fixture.
- Reject API keys whose nonnull `owner_user_id` or `user_id` contradict authoritative `created_by` before a service-role client resolves tenant membership or records usage. Optional NULL legacy aliases remain valid with authoritative creator, current membership and approval. The creation route already sets the three fields consistently. No email is invented for legitimate machine/API identities.

The twenty exact policies come from the preserved schema-only capture at `tmp/execution06-staging-closure/tmp/execution06b-staging-catalog.json`; the four helper bodies were also compared with the 17 November read-only catalog. The fixture is not a claim that the current hosted catalog is unchanged. Any hosted drift must stop this package under its own future review/approval.

## Validation

- Original baseline: 120 cases, 20 unintended TRUE results.
- Extended unfixed baseline: 1,672 observations, 124 unexpected results (20 helper cases plus 104 direct-policy properties).
- Final repaired PostgreSQL fixture: **1,689 observations, zero unexpected results**. Includes direct RLS reads across nineteen tables/twenty policies; missing/blank/tab/injection/padded and case-variant identities; legitimate email-less UID/tenant/API-key alternatives; conflicting UID and foreign-session principals; approval revocation/session deletion for both blank and valid-email fixtures; independent concurrent principals; repeated/concurrent migration; function/policy drift; and unreviewed alternate-policy refusal.
- Application boundaries: **140 tests passed**, including real API-key hash/owner/tenant/current-approval validation, signed workload JWTs, decision-only execution denial, delegated authority and deterministic property tests, native outcomes and pre/post evidence-download authorization. Network was denied and real credential environment variables removed. The five new principal tests were rerun after the lint-only test variable rename and passed.
- Changed-source/test ESLint, fresh Next route type generation and full TypeScript typecheck passed. `git diff --check` passed.

Run local database regression from repository root with a complete PostgreSQL 17 binary directory explicitly supplied:

```text
python tools/qualification/ownership-email-postgres.py --postgres-bin <local-postgres-bin> --evidence tmp/ownership-email-results --baseline
python tools/qualification/ownership-email-postgres.py --postgres-bin <local-postgres-bin> --evidence tmp/ownership-email-results
node --import tsx --test tests/ownership-principal-boundaries.test.mjs tests/evidence-download-approval.test.mjs tests/public-api-v1-security.test.mjs tests/api-key-stability.test.mjs tests/workload-identity.test.mjs tests/workload-decision-boundary.test.mjs tests/native-delegated-authority.test.mjs tests/native-delegated-authority-integration.test.mjs tests/swarm-delegation-properties.test.mjs tests/native-enforcement-outcome-proof.test.mjs tests/native-enforcement-outcome-proof-integration.test.mjs
```

The Python harness creates a new owned loopback cluster, ignores hosted/database credentials, checks its exact data directory and stops it in `finally`. Synthetic fixtures and stopped data directories are retained. Root handoff evidence records the exact migration hash, raw failed/passing attempts and new review commit SHA.

## Alternate paths and limits

Authenticated legacy pages/API-key summaries/evidence upload use the user-scoped client and these direct RLS predicates. Evidence download calls the case-owner wrapper before and after service-role byte access. The evidence wrapper and text team overload delegate to repaired functions. Triggers that populate audit/signal owners do not grant access; direct policy comparisons no longer treat absent email as ownership. Local tests verify API-key creation-owner consistency, current tenant membership/approval, workload issuer/audience/scope, delegated subsets and decision-only tool-dispatch restrictions.

`service_role` intentionally bypasses RLS. The PostgreSQL regression explicitly proves it can still read its synthetic rows; this repair does not convert a service key into an end-user isolation boundary. Privileged routes must resolve approved server-side tenant/actor/role and filter enterprise IDs; arbitrary service credential possession remains privileged. No claim is made that every service route, managed Auth signature, Storage HTTP path or hosted race is fully qualified by local tests.

The repair does not redesign legacy email-based ownership, qualify email-change/recycling lifecycle, revoke all intentional definers, change Auth settings, or prove hosted exploitability against customer records. Those release gates remain. A fresh approved review head plus accepted recovery evidence and separate migration authorization are required before hosted application. Never amend applied historical migrations or silently substitute this head for an approved candidate.
