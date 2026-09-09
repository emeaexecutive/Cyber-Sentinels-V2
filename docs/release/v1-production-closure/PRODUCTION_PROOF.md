# CYBER SENTINELS V1 — PRODUCTION PROOF

**PRODUCTION API = NO-GO. V1 = NOT CLOSED. V2 ENTRY GATE = CLOSED.**

Qualified on 2026-09-09T09:49:56.204Z. The Production authority policy requires SERVER_VERIFIED_AGENT_CONFIGURATION and SERVER_VERIFIED_MONITORING_HEARTBEAT. Their only implemented producer is the synthetic Staging provider, which is prohibited in Production. The legitimate external request therefore returns REVIEW. No evidence was fabricated and no policy was weakened.

## Exact release provenance

| Field | Recorded result |
| --- | --- |
| PR #80 | Qualified head b72955f09c2ccc5558b53771f7680647a0f734b8; normally merged at 2026-09-09T08:21:38Z |
| Initial merge / freeze | 98c223f7acb709dcfab8d33a435d7e551cfd4c2c |
| Release-critical PR #81 | Native agent evidence UUID routing; merged as 92655fd2f11da622b725050f1f33dcd72f0851d5 |
| Release-critical PR #82 | Owned workspace creation under tenant read policies; merged as fce70e052a6d6b9bbe6842755b66c7354e70c8ed |
| Final MAIN / V1 source freeze | fce70e052a6d6b9bbe6842755b66c7354e70c8ed |
| Production deployment | dpl_E5FPiv52DeewicTa1kbcWjsv5eSk |
| Deployed SHA | fce70e052a6d6b9bbe6842755b66c7354e70c8ed |
| Decision lifecycle executed on | 92655fd2f11da622b725050f1f33dcd72f0851d5, deployment dpl_9Vdno9d7Xc34Aw3mcYuRD52Y1NTF |
| Evidence re-read and tenant isolation on | fce70e052a6d6b9bbe6842755b66c7354e70c8ed |
| API version | 2026-08-29 |

Deployment metadata, health release version and readiness runtime SHA agree. The later workspace fix did not change authorization code. Historical transaction provenance remains recorded; it is not relabeled as execution on a later commit. Only release-critical fixes were added after the initial freeze. No new product capability, redesign, policy weakening or competitor wording was introduced.

## Production database

Exact target: **kecgtsfibkypjuaxqbjx**, verified before mutation. The initial 108-entry ledger and schema matched the previously qualified reconciliation plan. All original 108 ledger names and SQL hashes remain unchanged.

The documented aliases 20260901120000, 20260903093116 and 20260904100313 were recorded. Only logical migrations 202609060001, 202609060002 and 20260907120000 were applied. Final ledger: **114** entries; post-release dry run: up to date with no pending migrations.

Migration, schema, RLS and checked RPC security: **PASS**. Public-table RLS remains enabled. All five sensitive RPCs checked deny PUBLIC/anon/authenticated execution and allow service_role. World replay uniqueness, provider/action constraints and workspace foreign key are present. Existing rows violate neither newly added NOT VALID constraint; those constraints were not independently marked validated. See [schema](production-schema-after.json) and [migration audit](production-migration-final.json).

A fresh logical backup of public, auth and migration history was created before mutation. Its custom archive listing was readable and Windows DPAPI encryption roundtrip preserved SHA-256 E6C4C6F15CBD956BFCC207DAC595DF49492AC86F926CB2530AF598D4109DA1D2. The encrypted archive remains outside the repository in the operator's local Production backup directory. No fresh restore rehearsal was performed in this run, and no raw backup or credentials are included here.

## External Customer Zero results

The agent used a separate Node HTTP process and public SDK. Its key was issued through the authenticated owner application's supported API-key surface. Its Ed25519 private key was generated outside the server and never exposed. No service-role key, direct database manipulation, internal server function, mocked response, synthetic Production provider or forced decision was used for Customer Zero.

| Field | Actual Production result |
| --- | --- |
| Agent | agent:f5ba7928-39ea-4a54-8030-1f3200a785ab |
| Tenant | 138426bb-ec4c-49c2-acf5-a9b39fa72d82 |
| Challenge | 1f3ae36e-0765-41d2-9629-4c4ecdada3e4 |
| Identity | VERIFIED |
| Authority | b4a52745-151d-4ff8-bafb-bf6767eee821 |
| Delegator | tenant-admin:174b6184-2789-494a-a07e-a87adca5003e |
| Approver | api-client:5ad4996a-a495-4808-97af-3c118653eaf9 |
| Action | read_repository |
| Resource | repository:customer-zero-v1-release-evidence |
| Purpose / environment | deployment_evidence_review / production |
| Authority validity | 2026-09-09T09:15:42.629+00:00 to 2026-09-09T10:14:02.51+00:00 |
| Policy | external-agent-trust-v1 / 0.2.0 |
| Decision #1 | **REVIEW**, with valid scope but missing verified configuration/monitoring evidence |
| Transaction #1 | a389359e-febd-5e99-ac2f-3e0b141d2399 |
| Receipt #1 | [Public API receipt](https://www.cybersentinels.com/api/v1/trust/transactions/a389359e-febd-5e99-ac2f-3e0b141d2399/receipt) — authenticated access required |
| Replay #1 | [Public API Replay](https://www.cybersentinels.com/api/v1/trust/transactions/a389359e-febd-5e99-ac2f-3e0b141d2399/replay) — authenticated access required |
| Evidence #1 | 77da38ac-a4f2-4f41-a094-797b6362ffb1, 51debea8-b85d-4f18-ac8e-823b10d74e8a |
| Memory #1 | aa078ed9-e425-4840-9471-351f056eb6e3 |
| Authority revocation | authority-revocation:b4a52745-151d-4ff8-bafb-bf6767eee821 |
| Revocation time | 2026-09-09T09:18:29.365461+00:00 |
| Action #2 | Same agent, resource, action, purpose and environment |
| Identity after revocation | VERIFIED |
| Decision #2 | **DENY**, including AUTHORITY_REVOKED and CONTRACT_REVOKED |
| Transaction #2 | 522ec390-4bc6-5b62-9830-553a0498248c |
| Receipt #2 | [Public API receipt](https://www.cybersentinels.com/api/v1/trust/transactions/522ec390-4bc6-5b62-9830-553a0498248c/receipt) — authenticated access required |
| Replay #2 | [Public API Replay](https://www.cybersentinels.com/api/v1/trust/transactions/522ec390-4bc6-5b62-9830-553a0498248c/replay) — authenticated access required |
| Evidence #2 | 77da38ac-a4f2-4f41-a094-797b6362ffb1, 51debea8-b85d-4f18-ac8e-823b10d74e8a |
| Memory #2 | c31b17f1-dac1-4bd7-a2a0-bb7257fbb7d5; links previous transaction #1 |

Evidence Graph and Trust Memory were retrieved through supported authenticated application APIs. The original decision, digest and reason codes were checked for immutability. Machine-readable evidence is in [customer-zero.json](customer-zero.json) and [application-evidence.json](application-evidence.json).

## Negative and outcome-review checks

| Check | Result |
| --- | --- |
| Invalid API key | PASS: 401 |
| Wrong Ed25519 key | PASS: 409; no verified proof issued |
| Consumed challenge replay | PASS: 409 |
| Missing authority | PASS: 409 AUTHORITY_NOT_FOUND; no ALLOW |
| Wrong action | PASS: DENY |
| Revoked authority | PASS: DENY while identity remained VERIFIED |
| Cross-tenant isolation | PASS: two real workspaces, own-agent positive controls; cross-tenant agent, transaction, receipt and Replay reads rejected with 404 |
| Decision Outcome Review | PARTIAL: original REVIEW preserved; later DENY / CONTRADICTED persisted in receipt, Replay and Memory |
| Required original ALLOW outcome example | **NOT PROVEN**; same Production evidence blocker |

The outcome review is a user-authorized controlled adjudication after revocation, not an assertion of provider success or downstream execution. Review Memory: 86cc1f0c-1bb1-4666-ad39-f559e6f0b2d3. The application's later manual-review resolution guard rejected an attempted rejection because authority was already revoked; no approval was issued.

Tenant isolation evidence: [tenant-isolation.json](tenant-isolation.json). The second workspace was created through the corrected normal form. Both temporary proof API keys were revoked through the supported API-key application path; [cleanup](key-cleanup.json).

## Validation and limitations

Final local suite: **1,343 PASS, 0 failures, 0 skips**. Lint and typecheck passed. Required CI, Production build, Docker qualification, CodeQL and secret scanning passed. CI skips its Windows-only audit-runner test; that test passed locally. The optional Supabase Preview integration was skipped. Production migration qualification was performed independently.

Health, readiness, OpenAPI, login, enterprise access and developer docs are available. Anonymous API-key access redirects to login as expected. Readiness still reports externalControls BLOCKED / AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED; authorization readiness is not evidence of downstream enforcement. See [final baseline](baseline-final.json).

The first Production deployment exposed a fail-closed 503 from querying a UUID evidence ledger with an agent-prefixed identifier. PR #81 corrected it and the subsequent external decision path returned canonical REVIEW/DENY. The initial failed run is preserved in customer-zero-initial-98c223f-blocked.json. No post-fix 5xx was found in the sampled qualification log window. A later optional cleanup request encountered a client ECONNRESET and is not counted as a completed proof.

World ID remains **IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED**.

Homepage positioning was checked for accuracy. It leads with “Before an AI agent acts, prove it has the authority to do so” and explains actor/action/policy evaluation, ALLOW/REVIEW/DENY and preserved evidence. No redesign or competitor comparison was added.

Observed release findings: **P0 = 0; P1 = 1; P2 = 0**. These counts describe this qualification, not all unexercised behavior. The P1 is the missing legitimate Production evidence path required for the mandatory positive ALLOW lifecycle and original-ALLOW outcome review. Closing it requires real Production provider qualification or a separately scoped implementation; this run did not manufacture evidence or add that capability.

**Actual product proof: AI agent → verified identity → valid bounded authority → REVIEW for missing required evidence → receipt / Replay / Memory → revoke authority → same action → DENY with identity still VERIFIED.**

The required **ALLOW → revoke → DENY** proof is not complete. Therefore **V1 is NOT CLOSED and V2 remains CLOSED**. The [demo narrative](CUSTOMER_ZERO_DEMO.md) states only these observed facts.
