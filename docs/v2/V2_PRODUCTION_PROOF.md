# V2 Production Proof — updated 13 September 2026

**PRODUCTION API = GO for the repaired incident path. V1 = CLOSED. V2 EPIC 1 = PRODUCTION EXERCISED.**

## Release and deployment (completed, verified)

| Field | Result |
| --- | --- |
| PR #88 | MERGED (squash `ac63b45bdb8ebe6f33778ebbde6a0f5bc4a2c8b1`), head verified as `dd7dc468bf0aa582409289567b993d6a0f6d359b` before merge, 7 success / 1 skipped / 0 failing checks |
| Main SHA | `ac63b45bdb8ebe6f33778ebbde6a0f5bc4a2c8b1` |
| Production deployment | `dpl_Hnwpw9tMSK4BkYyQ7iTW5SvCfqMp` (superseding an earlier deployment, `dpl_22YToWFACRMBZp62uXRax53z8AMu`, that was redeployed to fix a git-metadata defect — see below) |
| Alias | `https://www.cybersentinels.com` |
| Deployed SHA verification | File-tree match (clean git worktree at exact SHA) **and** live `/api/ready` self-attestation `runtime.commitSha == ac63b45bdb8ebe6f33778ebbde6a0f5bc4a2c8b1`, `repositoryRuntime: VERIFIED_FROM_RUNTIME` |
| Migration `20260909163513_operational_incident_evidence_foundation` | Confirmed already applied via read-only `supabase migration list --linked` (not reapplied) |

### Defect found and fixed during this run

The first production deploy (`dpl_22YToWFACRMBZp62uXRax53z8AMu`) was uploaded from a `git worktree` (a `.git` file pointer, not a real `.git` directory). Vercel could not detect git commit metadata from it, so the live app self-reported `runtime.commitSha: null` on `/api/ready`. Root-caused, then fixed by deploying instead from a proper `git clone` checked out at the exact same commit with the correct GitHub origin remote restored. The corrected deployment now self-attests the exact SHA. No code changes were required; this was a deployment-process defect, not an application defect.

## V1 Production chronology

The historical old-harness attempt below is preserved. It returned `REVIEW` and is not the final V1 result. The correct control-plane harness subsequently produced the real Production `ALLOW` transaction `8369073a-b463-5a41-aba9-9ed2f1425f79`, accepted a signed heartbeat with `SERVER_VERIFIED_AGENT_CONFIGURATION` and `SERVER_VERIFIED_MONITORING_HEARTBEAT`, then produced `DENY` for the same action after authority revocation. V1 is closed with no regression.

## Historical V1 Production regression

| Stage | Result |
| --- | --- |
| Owner-session API key issuance | PASS (via existing Playwright owner-session flow, `tools/release/v1-production-key-session.mjs`) |
| Readiness / health checks | PASS |
| Agent registration, credential, manifest, Ed25519 challenge/proof | PASS, identity VERIFIED |
| Negative: wrong Ed25519 key, challenge replay | PASS (rejected) |
| Authority grant | PASS |
| **First transaction ALLOW** | **FAIL** — real decision returned `REVIEW`, not `ALLOW` |

Failure detail:
```
AssertionError: Preserve a real non-ALLOW; never force success
'REVIEW' !== 'ALLOW'
```
Live trust-fabric evidence on the decision showed `identityContinuity: "review_required"`, `monitoringCoverage: "partial"`, `signingBoundary: "unsigned"`. This reproduces a previously documented architectural gap (see historical `tools/release/v1-production-final-report.mjs`): Production's authority policy requires `SERVER_VERIFIED_AGENT_CONFIGURATION` and `SERVER_VERIFIED_MONITORING_HEARTBEAT` evidence, and the only implemented producer of that evidence is the synthetic Staging provider, which is correctly prohibited from running against Production. A legitimate external client (Customer Zero, as required) has no currently implemented way to satisfy this gate in Production.

No decision was forced, fabricated, or weakened. The test correctly halted on the real non-ALLOW result rather than reporting a false PASS.

## V2 Epic 1 Production qualification

The narrow harness `tools/release/v2-production-epic1-customer-zero.mjs` was created and executed from the hard-locked release worktree. Its first live operation fetched the required root transaction through the fresh least-privilege Production key:

```text
GET /api/v1/trust/transactions/8369073a-b463-5a41-aba9-9ed2f1425f79
404 RESOURCE_NOT_FOUND
The transaction is unavailable to this API client.
```

The existing Production server correctly scopes canonical transaction reads by both tenant and `actor_id` (the API client identity). The V1 ALLOW was created by the prior V1 key, so the new V2 qualification key could not legally read it. Per the qualification instructions, the harness stopped at this gate. It did not substitute a fixture, create synthetic Production evidence, open an incident, or claim any V2 lifecycle stage.

The harness contains the required Production guards and uses the existing V2 APIs only. The existing runtime already labels client evidence as `PUBLIC_API_CLIENT_ASSERTION`, `independent_evidence: false`, `server_verified: false`, and `CLIENT_EVIDENCE_IS_AGENT_ASSERTED`; no product code or migration was changed.

## V2 negative tests

Not run because the required legal root transaction was unavailable to the new qualification client. The root gate failed before any V2 record could be created. Existing negative coverage in `docs/v2/closure-20260910/` remains explicitly Staging evidence and is not claimed as Production qualification.

## Cleanup

The temporary V2 Production qualification key (`f3572906-57ab-4e99-9cdf-eb3b80a09a41`, tenant `138426bb-ec4c-49c2-acf5-a9b39fa72d82`) was revoked via `PATCH /api/developer/api-keys` (`status: revoked`, confirmed). No qualification authority was created. Local DPAPI credential material and metadata were removed. The immutable V1 proof remains preserved.

## Historical unblocking assessment — superseded by the same-client proof

Production needs a supported tenant/client handoff or a first-party read path that allows a fresh least-privilege qualification client to reference an existing ALLOW transaction without weakening actor isolation. Until that legal root-reference path exists, V2 Epic 1 Production qualification cannot be honestly completed. No policy, migration, provider, or deployment was changed during this attempt.

The assessment above was incorrect: no handoff or broader read access is needed. On 13 September, one fresh key created its own V1 ALLOW and legally read it for V2. The previous failed attempt remains useful evidence that actor isolation works.

## Final same-client V1 → V2 Production attempt — 13 September 2026

Worktree: `C:\Users\emeae\Desktop\cyber-sentinels-v2-release`. All changes in this attempt are qualification tools and documentation. Existing dirty proof records were preserved. No product source, ownership rules, migrations, or deployment changed. Epic 2 was not started.

Chronology is preserved:

1. Old V1 harness: REVIEW; obsolete path, not the final V1 result.
2. Correct V1 control-plane harness: ALLOW → authority revoke → DENY; PASS on 11 September.
3. Fresh V2 client reading the old V1 transaction: 404; correctly blocked by actor ownership.
4. One combined client, fresh V1 ALLOW, same-key V2 root: PASS; subsequent incident creation: **503, BLOCKED**.

### Scope and release contract

COMBINED QUALIFICATION SCOPES = `agents:write`, `agents:verify`, `authority:read`, `authority:write`, `trust:request`, `trust:read`, `outcomes:write`, `review:read`, `review:write`, `incidents:read`, `incidents:write`, `evidence:write`, `evidence:export`.

These 13 explicit scopes are supported by `lib/public-api/v1/contracts.ts`, the owner/admin issuance API, and migration `20260909163513_operational_incident_evidence_foundation.sql`. Production accepted exactly this set on issuance. No wildcard or admin-all scope was used. Local HEAD `dd7dc468bf0aa582409289567b993d6a0f6d359b` has no differences from deployed `ac63b45bdb8ebe6f33778ebbde6a0f5bc4a2c8b1` in the inspected API source and migrations. Live readiness independently reported the deployed SHA.

The combined utility targets only `https://www.cybersentinels.com`, requires `I_CONFIRM_PRODUCTION=kecgtsfibkypjuaxqbjx`, refuses Staging/database credentials, enforces the release worktree, and uses the existing authenticated owner/admin application API. It preserves the existing V1 authority boundary: `read_repository`, target prefix `repository:customer-zero-v1-release-evidence`, purpose `deployment_evidence_review`, environment `production`, maximum TTL 3600 seconds. The raw key was persisted only with Windows DPAPI outside the repository.

| Identity | Value |
| --- | --- |
| Combined key | `11c96c2a-b684-4b0c-9cfa-b73dab50663a` — revoked after the terminal proof attempt |
| Combined client | `c7e32db1-afe0-4df4-8fcd-412718b17bd4` |
| Tenant A | `138426bb-ec4c-49c2-acf5-a9b39fa72d82` |
| New V1 ALLOW transaction | `6b2d5c3c-ff1c-58c7-bdb1-0b47c32224e3` |
| Tenant B, negative tests only | `ab10b640-e72f-4910-a44c-4eb8522bbaa7` |

### V1 and same-client ownership — PASS

The [new V1 proof](production-qualification/same-client-20260913/v1/customer-zero.json) records registration, Ed25519 credential, signed manifest, possession proof, VERIFIED identity, bounded authority, signed heartbeat, both server-verified control-plane evidence references, first decision ALLOW, receipt, replay and Trust Memory. Authority revocation then produces DENY. The API key remained active for V2.

The [V2 proof](production-qualification/same-client-20260913/v2/customer-zero.json) begins with successful same-key root, receipt and replay reads. `DECISION_PERSISTED` is attributed to `principal:c7e32db1-afe0-4df4-8fcd-412718b17bd4`; the receipt exposes `trust-memory:6b2d5c3c-ff1c-58c7-bdb1-0b47c32224e3`, and replay contains `TRUST_MEMORY_WRITTEN`. Tenant binding is established through the V1 agent response. A later read-only diagnostic additionally confirms the raw transaction's `actor_id` and `enterprise_id`; this diagnostic was not an external-client bypass.

### Controlled evidence — accepted; incident lifecycle — BLOCKED

Six real public API submissions were accepted: EXECUTION_OBSERVATION, OUTCOME, DETECTION, INTERVENTION, CONTAINMENT and REMEDIATION. They are controlled qualification assertions, not downstream execution or a customer incident. Responses retain `AGENT_ASSERTED`, `independent_evidence=false`, `server_verified=false`, and `CLIENT_EVIDENCE_IS_AGENT_ASSERTED`. Read-only diagnosis confirms stored `source_type=PUBLIC_API_CLIENT_ASSERTION` for all six.

Only a provider-layer `UNKNOWN` outcome observation was submitted. Runtime, destination and adjudicated outcomes remain unobserved/unset; no destination result or V1 destination-outcome submission was manufactured. Evidence acceptance does not establish incident chronology, completed intervention/remediation, or export readiness.

The first `POST /api/v1/incidents` returned `503 INTERNAL_ERROR`, message `Incident persistence is unavailable.` The [read-only diagnostic](production-qualification/same-client-20260913/database-diagnostic.json) establishes the cause:

```text
persist_operational_incident_v2 contains: not coalesce(k.revoked,false)
Production public.api_keys has no column named revoked
Read-only SELECT of the same predicate: SQLSTATE 42703
column k.revoked does not exist
```

The incident function is present, but its authentication predicate references a nonexistent legacy column. No incident was persisted for the combined client (count 0). No retry, fixture, substitute transaction, or privileged write was used. Fixing this requires database-function/migration work, outside this request's explicit constraints. That work was not opened.

### Production negative checks

The [negative proof](production-qualification/same-client-20260913/negatives.json) and [cleanup proof](production-qualification/same-client-20260913/cleanup.json) record ten successful checks:

- V1-only `trust:read` key rejected for incidents:read, incidents:write and evidence:export with 403 INSUFFICIENT_SCOPE. Read/export probes prove the scope gate before resource lookup; they do not claim access tests on a real incident.
- Same-tenant wrong client: V1 root read and V2 root hijack both rejected with 404 RESOURCE_NOT_FOUND.
- Tenant B: Tenant A V1 root read and V2 root hijack both rejected with 404 RESOURCE_NOT_FOUND.
- Caller-forged derived state on incident creation: 400 INVALID_REQUEST.
- Invalid digest at public evidence submission: 400 EVIDENCE_DIGEST_MISMATCH.
- Unsupported issuance scope: 400 INVALID_API_KEY_INPUT; no key created.

Cross-tenant incident read, evidence linking, chronology and export, incident-link digest validation, and incomplete-incident export NOT READY remain **NOT EXERCISED** because no incident exists. These are not marked PASS. The original ALLOW and decision/request/evidence digests remain unchanged after all executed negative checks.

### Cleanup — PASS

Both attempts reached terminal results before cleanup: V1 PASS and V2 BLOCKED. All four temporary keys (combined, V1-only, wrong-client, Tenant B) were revoked through the owner/admin API. Each subsequently returned **401 API_KEY_REVOKED**, and owner key listings confirmed revoked status. The only qualification authority was already REVOKED, reconfirmed through get/list. All four local DPAPI files and their temporary metadata were removed; safe metadata remains in the immutable proof artifacts.

TEMP API KEYS ACTIVE = **0**. QUALIFICATION AUTHORITIES ACTIVE = **0**. Counts refer to this run's qualification resources.

### Validation and final report

`node --import=tsx --test tests/public-api-v1-security.test.mjs tests/operational-incidents.test.mjs`: **74 passed, 0 failed**. These local tests are not a replacement for the blocked Production lifecycle. Qualification script syntax and diff checks were also performed. Full application tests/lint/typecheck/build and deployment were not triggered because no product source changed.

| Required field | Result |
| --- | --- |
| WORKTREE USED | `C:\Users\emeae\Desktop\cyber-sentinels-v2-release` |
| COMBINED QUALIFICATION KEY | PASS |
| COMBINED CLIENT ID | `c7e32db1-afe0-4df4-8fcd-412718b17bd4` |
| NEW V1 TRANSACTION ID | `6b2d5c3c-ff1c-58c7-bdb1-0b47c32224e3` |
| V1 ROOT READ BY SAME CLIENT | PASS |
| V1 FIRST DECISION | ALLOW |
| SIGNED HEARTBEAT | PASS |
| SERVER_VERIFIED_AGENT_CONFIGURATION | PASS |
| SERVER_VERIFIED_MONITORING_HEARTBEAT | PASS |
| V2 ROOT OWNERSHIP | PASS |
| QUALIFICATION PROVENANCE | PASS |
| EXECUTION OBSERVATION | PASS — controlled assertion only |
| OUTCOME | PASS — provider UNKNOWN evidence accepted; incident outcome linkage blocked |
| INCIDENT | FAIL — 503, SQLSTATE 42703 |
| EVIDENCE LINK | FAIL — blocked, not exercised |
| CHRONOLOGY | FAIL — blocked, not exercised |
| INTERVENTION | FAIL — incident lifecycle blocked; evidence submission alone accepted |
| REMEDIATION | FAIL — incident lifecycle blocked; evidence submission alone accepted |
| EXPORT | FAIL — blocked, not exercised |
| DIGEST | FAIL — package verification blocked; invalid submission digest rejection passed |
| REPLAY | PASS V1; FAIL/BLOCKED V2 incident replay |
| TRUST MEMORY | PASS V1; FAIL/BLOCKED V2 incident memory |
| SAME-TENANT WRONG-CLIENT REJECTION | PASS — V1 read and V2 root hijack |
| CROSS-TENANT ISOLATION | FAIL qualification coverage — root checks pass, incident checks blocked |
| NEGATIVE TESTS | FAIL complete matrix — ten checks passed, incident-dependent checks blocked |
| TEMP API KEYS ACTIVE | 0 |
| QUALIFICATION AUTHORITIES ACTIVE | 0 |
| P0 | 0 observed in this attempt |
| P1 | 1 — Production incident RPC references nonexistent `api_keys.revoked` |
| P2 | 0 additional observed |
| PRODUCTION API | GO for repaired V2 qualification |
| V1 | CLOSED |
| V2 FOUNDATION | PRODUCTION EXERCISED |
| EPIC 1 | PRODUCTION EXERCISED |
| CYBER SENTINELS V2.0 | CLOSED |
| EPIC 2 ENTRY GATE | CLOSED |

## Forward RPC repair and resumed Epic 1 — 13 September 2026

The Production incident persistence defect was repaired with the forward-only migration `20260913132642_fix_operational_incident_api_key_revocation_check.sql`. Historical migration `20260909163513_operational_incident_evidence_foundation.sql` was not edited, and no `api_keys.revoked` column was added. The repaired function preserves tenant, client, key, scope, expiry, advisory-lock, actor-binding, evidence-digest, ownership, export, Replay, Trust Memory, `SECURITY DEFINER`, fixed `search_path`, and grant behavior.

The focused repair regression passed 12/12, including the absent-column contract, active/revoked key states, expiry, missing scope, wrong tenant/client/key, actor ownership, and grants. The broader incident/security validation passed 74/74. Staging dry-run and apply each contained only the forward repair migration; the post-apply Staging dry-run was up to date. A Staging public-client incident-create smoke test was **NOT RUN** because no reusable authenticated Staging session remained in this worktree; no Staging incident result is claimed.

Production dry-run and apply each contained only the same forward repair migration. The post-apply Production dry-run was up to date. A fresh combined Production client then produced V1 transaction `3261cff5-9d7e-5ddf-b6c2-442f42ab4db7` with `ALLOW`, verified the signed heartbeat and both server-verified control-plane evidence types, and preserved the V1 revocation-to-DENY proof.

Using that same client, the repaired V2 lifecycle passed:

```text
CONTROLLED_PRODUCTION_QUALIFICATION observation
-> provider OUTCOME UNKNOWN (runtime/destination/adjudicated outcomes unset)
-> incident 1aaa0c97-880e-426f-ad3a-92774db4c7bd
-> evidence links and chronology
-> intervention and remediation records
-> REGULATORY_EXPORT_READY
-> digest cd51de3f0e8d256075495a761afcd4496aee9af5a564b5a12c0afaa741b78139 verified independently
-> Replay
-> Trust Memory extension (9 records)
```

Controlled evidence remains explicitly `AGENT_ASSERTED`, `PUBLIC_API_CLIENT_ASSERTION`, `independent_evidence=false`, and `server_verified=false`. No downstream execution, customer impact, independent attestation, or real security incident is claimed. The original V1 `ALLOW` and its digests remained unchanged after the incident lifecycle.

The Production negative matrix passed 19 checks, including expired and revoked-key behavior, missing scopes, same-tenant wrong-client access, cross-tenant incident/evidence access, invalid evidence digest, caller-forged derived state, and export/read isolation. Cleanup passed with `TEMP API KEYS ACTIVE = 0` and `QUALIFICATION AUTHORITIES ACTIVE = 0`; all local DPAPI/token material was removed.

STAGING INCIDENT CREATE = NOT RUN — authenticated Staging session unavailable

This is a non-blocking P2 coverage gap. The identical repaired RPC was regression-tested locally and applied and exercised successfully in Production. No Staging PASS is claimed.

## Deferred V2.0 roadmap

These are backlog items only. They were not built during V2.0 closure.

1. **Interview Content / AI Observation Policy**
	Define policy dimensions for AI assistance, recording, transcript retention, external AI observation, third-party aggregation or training, and interview-content redistribution. The governed path remains Policy -> Decision -> Receipt -> Replay -> Trust Memory.

2. **External-Effect Authority & Target Scope**
	Extend the existing authority chain only in a future scope: Authority -> Agent -> Target -> Permitted Action -> External Effect -> Independent Evidence -> Outcome -> Replay -> Trust Memory. Candidate states include `TARGET_AUTHORITY_VERIFIED`, `TARGET_OUT_OF_SCOPE`, `EXTERNAL_EFFECT_UNAUTHORIZED`, `ACTION_SCOPE_EXCEEDED`, `CREDENTIAL_ACCESS_UNAUTHORIZED`, and `EXTERNAL_CHANNEL_UNAUTHORIZED`.
