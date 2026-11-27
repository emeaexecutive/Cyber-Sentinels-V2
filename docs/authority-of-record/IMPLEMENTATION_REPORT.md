# Authority of Record + TENENTE — implementation evidence, 8 October 2026

**CORE PRODUCTION: NO-GO. AUTHORITY OF RECORD + TENENTE: PARTIAL.** The implemented native evaluator/reservation/controlled HTTP path is WORKING_LOCAL. This is executable incremental work with actual PostgreSQL and HTTP evidence, not complete authenticated application or provider qualification.

Branch: `feat/authority-of-record-tenente`. Base/frozen Core RC: `5e7b9ed8670f87b8df5884f5c880660125fc4be7`. The feature implementation is the commit containing this report; resolve its exact SHA with `git log -1 --format=%H -- docs/authority-of-record/IMPLEMENTATION_REPORT.md`. The final delivery message also records the SHA. No commit modifies the frozen Core branch.

The CPTO directive of 8 October authorizes local development now and supersedes the earlier planning-only gate for this work. Shared release gates remain closed. **Zero shared Staging/Production mutations, migrations, credential changes or deployments were made in this feature task.**

## A. What already existed

Reused canonical trust transactions, trust contracts/policy versions, signed native identity/delegation and acceptance, delegated-action evaluations, authority graph builder, enforcement reservation/acknowledgement/outcome correlation, governed human review, canonical receipt export, evidence graph, Replay, Trust Memory and entity console. No parallel policy engine, authority database or receipt database was introduced.

## B. What was implemented

Added exact-scope request normalization/digest binding; acceptance and ancestor validation; current credential checks; native full-action payload freezing; durable exact reservation checks; controlled HTTP/MCP adapter; real Ed25519 receipt signing/verification; atomic audited suspension/revocation; and TENENTE controls inside the entity console. Added native PostgreSQL qualification tools and regression tests. The complete changed-file inventory is in `VALIDATION.json` and `git show --stat` for the implementation commit.

## C. Database/schema changes

One forward migration: `supabase/migrations/20261008120422_authority_of_record_exact_execution.sql`. Existing migrations and Core's canonical schema contract were not edited.

The migration adds nullable exact payload digest to existing enforcement requests, hardens the existing reservation RPC, adds SUSPENDED to existing delegation statuses, extends native Replay's event vocabulary, and adds `restrict_tenente_delegation_v1`. Restriction requires service execution plus an APPROVED workspace owner/admin; it atomically changes lifecycle state and appends Replay/Trust Memory with actor, reason and scope digest. It cannot edit signed authority payloads. Public/anon/authenticated cannot directly execute these service RPCs.

Fresh schema reconstruction in `aor_qualification_final6` applied the 12 migrations missing from the recorded catalog, including this migration. `LOCAL_SCHEMA_QUALIFICATION.json` records source hash, actual PostgreSQL engine and effective section fingerprints. This is schema reconstruction on PostgreSQL 17.6, **not a Production data restore on 17.11**.

## D. API changes

The existing entity delegated-authority POST accepts `action: restrict_tenente_authority`, `delegationId`, `operation: SUSPEND | REVOKE`, and bounded audit `reason`; existing authenticated context resolves tenant and actor. Native delegated-action evaluation can accept executable `parameters`; the server hashes the frozen action and rejects a conflicting caller digest.

Public v1 decision `action.exact_scope` adds tool/provider/payload digest/data scope and optional paired amount_minor/currency. Original request digests bind these fields; human approval must match that digest. Public exact-scope requests remain REVIEW (`EXACT_TOOL_EXECUTION_PATH_REQUIRED`) because the public legacy relay is not qualified for reservation-backed exact tool execution. They cannot use this additive contract to trigger the legacy relay.

Existing receipt responses add tenant ID, explicit cryptographic verification state and execution evidence separated from the decision. OpenAPI and SDK types reflect these additions. No new public verification/JWKS endpoint or SDK verification helper was introduced. API/OpenAPI/SDK/security/parity suite: 149 passing executions within full regression. This is automated contract/security evidence, not a fresh authenticated HTTP round trip through every application endpoint.

## E. Authority Graph implementation

The existing graph now receives traversable ancestor and leaf grants with parent links. Action-time validation rejects missing/cyclic/deep chains, wrong tenant/principal/root binding, inactive or expired ancestors, forbidden redelegation and expanded child scope. Root authority, acceptance fingerprints, owner and native identity are checked. Independent parent/child authority versions are not incorrectly required to match; policy versions must agree. Broader service/team actor modeling remains incomplete.

## F. Runtime enforcement path

Native action -> frozen digest -> delegated evaluation -> canonical decision/binding -> current-state check -> durable reservation RPC -> registered adapter -> signed destination observation -> existing outcome correlation. DENY/REVIEW return before execution dependencies. Reservation rechecks current policy validity/hash, credential, owner/entity, delegation and ancestor state; changed transaction/payload reuse of an idempotency identity fails.

The destination's own durable ledger is essential. HMAC integrity alone does not stop replay or revoke authority. Local qualification uses a real HTTP listener, actual reservation RPC and PostgreSQL business-effect ledger. It checks current delegation and consumes the idempotency identity with the effect. Exactly-once evidence is scoped to that controlled target, not a guarantee across arbitrary providers or distributed revocation races. Cumulative quota accounting and all policy/root/ancestor race combinations are not fully qualified.

## G. REVIEW/approval implementation

Existing governed review remains the authority source. Digest matching binds approval to original action, tool, provider, payload, value/currency, environment and context; the approval reference itself is excluded from the request digest. Historical empty-context digest compatibility is retained for comparison. AOR tests mutate bound values and reject reuse.

Actual database review RPC tests reject the unauthorized reviewer, permit the authorized reviewer and preserve the original REVIEW. Approval does not dispatch automatically; a fresh evaluation is required. A complete public exact-scope approval-to-execution journey remains PARTIAL, with the public path held at REVIEW. Native high-consequence approval regression tests pass.

## H. Execution / Authority Receipt

The existing receipt projection gains evidence of actual execution/outcome, retaining `decision_is_execution_proof: false` and UNKNOWN when appropriate. The local controlled target executed amount 100 once through HTTP and once through MCP. Its injected actual amount 1000 produced signed contradiction evidence and UNKNOWN outcome; ALLOW did not convert it into trusted success.

Ed25519 signs canonical tenant/receipt/key-bound payload claims. Verification uses pinned public keys and rejects tampering or an unknown key. This is a historical evidence signature, not an execution credential. Optional server key-file configuration exports SIGNED; absent configuration truthfully exports NOT_CONFIGURED. New signatures are generated over exported evidence projections; existing transaction history is not rewritten or copied to another receipt store.

## I. Trust Memory changes

Suspension/revocation append `TENENTE_AUTHORITY_RESTRICTED` to existing native Replay and Trust Memory atomically. The local database proves those appends and the historical ALLOW remains unchanged after revocation. Existing execution outcome graph/correlation paths are reused. No claim is made that every new anomaly has been browser-verified in a complete chronological UI.

## J. MCP/tool enforcement

Server-registered HTTP and JSON-RPC `tools/call` adapters share the exact payload and durable enforcement path. Outbound dispatch is HMAC protected and timestamp bounded; returned destination evidence is authenticated and correlated. Redirects, endpoint credentials, unsupported plaintext, oversized responses and wrong MCP IDs fail. One destination signing boundary remains one evidence source; acknowledgement and observation are not falsely counted as independent parties.

## K. Security/negative tests

[TEST_MATRIX.md](TEST_MATRIX.md) accounts for all 28 planned cases, distinguishing new native database/HTTP proof from unit coverage and unqualified journeys. Dedicated tests total 40; actual DB/HTTP qualification records 25 PASS checks. Additional checks cover stale dispatch, concurrent reservation, payload substitution, scope/identity binding, suspension, policy expiry and credential revocation after ALLOW, response bounds and secret-bearing parameters.

The scoped secret scanner reports raw FAILED due to one unchanged environment-reference heuristic finding in `lib/readiness/project-binding.ts:36`, plus one classified test fixture in `tests/world-id-verification.test.mjs:45`. Review found no new secret material. The raw finding and reviewed disposition remain distinct in `VALIDATION.json`; the scanner was not weakened.

## L. Test/lint/typecheck/build results

Final command results and log hashes are recorded in [VALIDATION.json](VALIDATION.json). Full regression: **2,033 tests passed across 89 invocations, zero failures/skips/cancellations**. Feature suite: 40 passed. API/OpenAPI/SDK parity/security: 149 passed as part of the full run. Local database/HTTP proof: 25 passed. Lint: zero errors, nine existing warnings in ignored scratch files. Typecheck and production build are separately recorded; a successful build is not a deployment.

Failures discovered and corrected during development: Docker daemon missing pipe; Supabase image did not honor the attempted generic trust-auth setting; reconstructed ownership caused private-schema migration permission failures; unqualified pgcrypto digest lookup; ambiguous PL/pgSQL state identifier; stricter acceptance checks exposed incomplete synthetic fixtures; an incorrect parent/child version equality assumption; newest guard test's fixture/TypeScript-loader setup. An attempted policy deactivation was correctly rejected by append-only protection; the test now creates an immutable short-lived policy and proves actual expiry. Earlier failed attempts were not counted as passes. Failed disposable databases were retained; no production constraint was weakened.

## M. Hosted proof

None for this feature. The preserved Core report records earlier Staging evidence (1,993 regression executions, 132 hosted checks and an 11-case native Golden flow); none is represented as a deployment or hosted proof of this feature commit. No Staging credential handoff was needed or consumed for this local task.

## N. Remaining blockers and limitations

- Authenticated Next.js API/console end-to-end qualification, including owner/admin UI clicks and cross-tenant routing, remains outstanding. UI was compiled/typechecked; actual database role checks were tested independently.
- The golden harness seeds synthetic identity and canonical decision fixtures directly, then exercises the real evaluator, reservation RPC and HTTP target. It does not prove the complete administrator-to-application creation flow or live identity attestation.
- Public exact-scope execution remains deliberately REVIEW. Full public approval, token consumption and provider execution must be qualified together before enabling ALLOW on that path.
- MCP session lifecycle/discovery, external provider certification, independent provider evidence, cumulative quotas and all dispatch races are not proven.
- Signing-key custody/rotation/discovery, public verifier distribution and broader actor types remain incomplete. No shared signer is configured.
- Fresh-checkout DB reproduction requires the retained schema-only baseline; no sensitive dump is committed.

## O. Production readiness / Core recovery

**CORE PRODUCTION: NO-GO.** Required secure Production backup, isolated native restore, evidence-object preservation, remaining storage/cache retirement checks, controlled Core RC promotion and Production verification remain outstanding. Local feature schema tests do not satisfy those gates.

Keith must retrieve the existing Production database password from the authorized password manager and the direct or session-pooler hostname for Supabase project `kecgtsfibkypjuaxqbjx`. Outside AI-visible capture, run from the repository:

```powershell
.\tools\release\backup-production.ps1 -DatabaseHost 'db.kecgtsfibkypjuaxqbjx.supabase.co'
```

Enter the password only at its hidden prompt; use the documented session-pooler port-5432 fallback if direct connectivity is unavailable. No reset or new role is requested. Follow `docs/production-recovery-procedure.md` for native PostgreSQL 17.11 restore validation and separate object-byte preservation. The earlier Staging service-role credential does not supply the Production database password. No Production promotion is authorized by this report.

## P. Provider-neutral adapter status

**WORKING_LOCAL subset / PARTIAL overall.** Real HTTP and MCP tool-call transports work against the controlled target. External providers remain unqualified. Operator registry and a shared destination evidence key are foundations; per-provider custody/isolation and operational certification require further work.

## Q. Machine-verifiable receipt status

**WORKING_LOCAL.** Genuine Ed25519, canonical hashing, tenant binding, verifier-pinned key, and tamper negatives pass. **PARTIAL operationally:** no KMS/rotation/discovery or shared deployment. Hashes and HMAC destination evidence are not presented as independently verifiable platform signatures.

## R. Intent / Decision / Execution / Outcome proof

Intent is the immutable full-action digest; decision remains canonical ALLOW/REVIEW/DENY; reservation/request and destination acknowledgement are distinct records; destination observation and correlated outcome remain separate. The database evidence includes transaction IDs for reconstruction, real business ledger effects and an unchanged historical signed projection. The target is controlled by the test operator; authenticated destination evidence is not an independent third-party audit.

## S. Delegation containment proof

Unit/regression tests reject child expansion, prohibited delegation, wrong tenant/principal and inactive ancestors. Actual SQL checks the chain at reservation and prevents in-place signed-scope mutation. Restrictions use suspension/revocation; narrowing requires an existing new bounded-grant workflow, not editing a signed grant. The complete human grant/narrow/regrant UI journey remains unqualified.

## T. DENY execution count

**0 after revocation.** The earlier authorized HTTP request remains one effect; idempotent retry adds zero. Suspension, revoked credential, expired policy and forged direct dispatch each add zero. Local evidence contains exactly three business effects: one expected HTTP, one expected MCP and one deliberately injected mismatch. The mismatch is retained, not hidden.

## U. REVIEW execution count before approval

**0.** The database qualification and dependency-level tests prove no dispatch for unresolved REVIEW. Authorized resolution preserves historical REVIEW and requires fresh evaluation; resolution itself executes nothing.

## V. Product Truth classification

**AUTHORITY OF RECORD + TENENTE: PARTIAL.** A tested native controlled-execution subset, audited TENENTE restrictions and genuine receipt primitives are **WORKING_LOCAL**. Complete public execution, authenticated UI flow, external integrations and operational signing are not fully qualified. Nothing in this task is labelled PROVEN_STAGING or PROVEN_PRODUCTION. Core Production remains NO-GO.
