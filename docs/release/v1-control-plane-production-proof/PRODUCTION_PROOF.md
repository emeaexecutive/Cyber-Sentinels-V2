# Cyber Sentinels — final V1 Production proof

**PRODUCTION API = GO · CYBER SENTINELS V1 = CLOSED · V2 ENTRY GATE = OPEN**

Qualified 2026-09-09T11:36:47.409Z. The GO scope is the first-party Production trust API described below.

| Required field | Verified result |
| --- | --- |
| STARTING MAIN SHA | fce70e052a6d6b9bbe6842755b66c7354e70c8ed |
| ROOT CAUSE | The two required verified evidence types had only a synthetic Staging producer, correctly prohibited in Production. |
| FIX IMPLEMENTED | Authenticated Ed25519 heartbeat endpoint; current signed baseline verification; atomic evidence pair; current-baseline eligibility; SDK/OpenAPI support; public error-code correction. |
| FILES CHANGED | 20; see [changed-files.json](changed-files.json) |
| NEW MIGRATION REQUIRED | NO — existing unique evidence_id, RLS and service-role writer verified. |
| PRODUCTION CONFIGURATION EVIDENCE | PASS — 1ffefb63-79c2-5dae-af55-2b86c00b6b3b |
| PRODUCTION MONITORING HEARTBEAT | PASS — 3bec814c-1fc7-59ab-8c5d-3f5cc5d52f57 |
| HEARTBEAT SIGNATURE | PASS — persisted signed manifest, public key, configuration digests and both accepted heartbeat events rechecked offline. |
| HEARTBEAT REPLAY PROTECTION | PASS — sequential replay rejected; concurrent replay yielded one accepted pair and one HEARTBEAT_REPLAY. |
| HEARTBEAT FRESHNESS | PASS — stale/future signed heartbeats rejected; 120s maximum age, 30s skew, at most 300s eligibility. |
| FULL TESTS | PASS — 1,481 passed locally, 0 failed, 0 skipped. CI: 1,480 passed, Windows-only case skipped and covered locally. |
| LINT / TYPECHECK / BUILD | PASS / PASS / PASS |
| CI | PASS — PR and final main verification, Docker, CodeQL, secret scan; optional Supabase Preview skipped. |
| PR | [#84 implementation](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/84); [#85 public error correction](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/85). A second narrow corrective PR was required after the first live run. |
| MERGE | Both merged after green required checks. |
| NEW MAIN SHA | b0f6b37d41714efa940852b3ef955e9c7317c513 |
| DEPLOYMENT | dpl_3yX9aPfmjumxNH2DS56dnzTFL7zc |
| DEPLOYED SHA | b0f6b37d41714efa940852b3ef955e9c7317c513 |
| CUSTOMER ZERO API KEY | e93a65d0-2ef9-42b8-bd3e-7f60342ce06d — issued through the authenticated application, subsequently revoked. |
| AGENT | agent:82b181d2-5325-4aaf-87d1-82c70884f3c2 |
| IDENTITY | VERIFIED through external Ed25519 possession proof; remained VERIFIED after authority revocation. |
| CONFIGURATION | PASS — current signed declaration; first-party provenance CYBER_SENTINELS_CONTROL_PLANE_VERIFIED. |
| MONITORING | PASS — SIGNED_CONTROL_PLANE_HEARTBEAT_ONLY; downstream execution not observed. |
| AUTHORITY | 5775b143-8b35-4652-bdc5-a2e0e5b15b40 — active at ALLOW; explicitly revoked before the second action. |
| POLICY | external-agent-trust-v1:0.2.0 — existing requirements unchanged and satisfied at ALLOW. |
| FIRST ACTION | read_repository; repository:customer-zero-v1-release-evidence; deployment_evidence_review; production |
| FIRST DECISION | ALLOW |
| FIRST TRANSACTION | eff3b7cf-5dce-5cdc-8292-b4ad572d8ca9 |
| FIRST RECEIPT | [Persisted receipt](https://www.cybersentinels.com/api/v1/trust/transactions/eff3b7cf-5dce-5cdc-8292-b4ad572d8ca9/receipt) |
| FIRST REPLAY | [Persisted Replay](https://www.cybersentinels.com/api/v1/trust/transactions/eff3b7cf-5dce-5cdc-8292-b4ad572d8ca9/replay) |
| FIRST TRUST MEMORY | 4080faf3-3bad-452b-a235-6841e6bd07df |
| REVOCATION | PASS — authority-revocation:5775b143-8b35-4652-bdc5-a2e0e5b15b40; current control-plane evidence excluded from the later decision. |
| SECOND ACTION | Same agent, action, target, purpose and environment; references the first transaction. |
| SECOND DECISION | DENY |
| SECOND TRANSACTION | 819313c8-1e2a-5d85-bdf0-d3d91f86ebab |
| SECOND RECEIPT | [Persisted receipt](https://www.cybersentinels.com/api/v1/trust/transactions/819313c8-1e2a-5d85-bdf0-d3d91f86ebab/receipt) |
| SECOND REPLAY | [Persisted Replay](https://www.cybersentinels.com/api/v1/trust/transactions/819313c8-1e2a-5d85-bdf0-d3d91f86ebab/replay) |
| SECOND TRUST MEMORY | 2930e58b-b7d5-4a79-b5ac-b1a597a55856 |
| DECISION OUTCOME REVIEW | PASS — original ALLOW; later DENY / CONTRADICTED; decision, digest and reasons immutable; Memory b5f6114e-350b-454e-9111-13bf8ca951b8. |
| TENANT ISOLATION | PASS — reciprocal agent reads denied, cross-tenant transaction/receipt/Replay denied, cross-tenant heartbeat denied. |
| NEGATIVE TESTS | PASS — invalid/revoked API keys; wrong signing key; challenge replay; missing/revoked authority; wrong action; heartbeat replay/concurrency, stale/future, wrong audience/tenant/agent/credential, and caller-supplied trust fields. Baseline rotation/expiry/mismatch and persistence failure also covered by tests. |
| TEMP API KEYS REVOKED | PASS — all four keys across both attempts revoked; final two return 401 API_KEY_REVOKED. Both temporary authorities revoked. |
| UNRESOLVED P0 / P1 / P2 | 0 / 0 / 0 known in the scoped V1 release qualification. |
| WORLD ID | IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED |
| PRODUCTION API | GO |
| CYBER SENTINELS V1 | CLOSED |
| V2 ENTRY GATE | OPEN |

## Preserved history

- PR83 previous run remains REVIEW → DENY because no legitimate Production configuration/monitoring producer existed.
- PR84 added the legitimate producer. An initial real ALLOW → DENY run exposed public error-code normalization drift.
- PR85 corrected the public error vocabulary. The final fresh-agent run passed all gates on the exact corrected main.

The previous NO-GO report remains unchanged in [../v1-production-closure/PRODUCTION_PROOF.md](../v1-production-closure/PRODUCTION_PROOF.md). The intermediate run is retained in [attempt-1-error-contract.json](attempt-1-error-contract.json), including its real ALLOW/DENY and revocation.

## Evidence and practical limits

[Machine validation](proof-validation.json), [raw public API proof](customer-zero.json), [application receipt/Memory/graph proof](application-evidence.json), [persisted signed records](persisted-control-plane.json), [offline signature verification](offline-signature-verification.json), [tenant isolation](tenant-isolation.json), [key cleanup](key-cleanup.json), [revoked-key rejection](revoked-key-rejection.json), and [validation](validation.json). Public API receipt/Replay URLs require appropriate authentication; their retained responses are included in the artifacts.

- Configuration authenticates the signed declaration; no independent runtime attestation is asserted.
- Monitoring covers a real signed control-plane heartbeat; no downstream execution or model invocation was performed.
- The readiness endpoint retains its broader externalControls=BLOCKED marker; no external control/provider qualification is claimed.
- All qualification authority and keys were revoked; the recorded ALLOW is historical and not standing authorization.

The deployment-scoped log query found no 5xx logs from 11:25:00 to 11:31:08 UTC on 2026-09-09. This is a bounded observation, not a claim about all traffic or future availability.

**VERIFIED AGENT → VERIFIED SIGNED CONFIGURATION → VERIFIED CONTROL-PLANE HEARTBEAT → VALID AUTHORITY → ACTION → ALLOW → RECEIPT → REPLAY → TRUST MEMORY → REVOKE AUTHORITY → SAME ACTION → DENY.**
