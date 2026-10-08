# Final Core closure — 8 October 2026

Core Staging qualification passes. Production remains unchanged. The replacement candidate is the Git commit containing this report; obtain its exact SHA with `git log -1 --format=%H -- docs/release/CORE_FINAL_CLOSURE_20261008.md`. The final handoff records the full SHA. No Production promotion is authorized by this qualification.

Evidence: [machine-readable qualification](CORE_CLOSURE_EVIDENCE_20261008.json), [46-file release manifest](CORE_RC_FILESET_20261008.json), [complete approval inventory](CORE_APPROVAL_BOUNDARY.md), [canonical schema decisions](CORE_CANONICAL_SCHEMA.md), [all 1,360 schema differences](CORE_SCHEMA_DIFFERENCE_CLOSURE.md), [exact Trust Memory provenance](CORE_TRUST_MEMORY_PROVENANCE.json), [recovery procedure](../production-recovery-procedure.md).

| # | Required result | Evidence / disposition |
|---:|---|---|
| 1 | Old RC SHA | `12d67951201b1dae6a3b91ac9fae405322671905` |
| 2 | Old RC disposition | **SUPERSEDED FOR PRODUCTION — REMAINS AUDITABLE** |
| 3 | Source changes | Exact default-deny middleware allowlist; database approval and tenant enforcement; atomic workspace owner membership; validated backend waitlist submission; approval-revalidated private evidence download; canonical evidence media types; schema comparison/reconstruction tools; recovery scripts; security tests and release documentation. |
| 4 | New migrations | Six forward migrations listed below; original six pending migrations unchanged. |
| 5 | Complete approval inventory | All public application tables/views/RPCs, sequences, Storage resources and discovered API methods enumerated. Final SQL probe covers 250 resources × four unapproved states = 1,000 reads, zero leaks. The markdown has 762 table rows including headers; this is not a claim of 762 distinct resources. |
| 6 | Preapproval allowlist | Own minimal approval status and blocked-login audit; login/waiting/logout/password-reset transport; public health/readiness; subject-bound consent and public consent catalogue/policy; validated/rate-limited access-request and waitlist submissions. Signed callbacks and API-key APIs have independent authentication and owner approval checks. All other API methods default to customer approval. |
| 7 | PENDING | PASS: 210 resources return zero rows, 40 deny permission; original five customer surfaces return zero. Hosted customer API 403 and dashboard redirects to approval waiting. |
| 8 | DENIED | PASS: same 250-resource zero-access result; Storage/gateway denied. |
| 9 | SUSPENDED | PASS: same 250-resource zero-access result; Storage/gateway denied after prior approval. |
| 10 | REVOKED | PASS: same 250-resource zero-access result; Storage/gateway denied after prior approval. |
| 11 | APPROVED positive control | PASS: legitimate owner/tenant reads and writes, atomic workspace membership, hosted evidence gateway bytes and qualified transactions. Approval does not bypass ownership/RBAC. |
| 12 | Cross-tenant | PASS: database writes/reads isolated; private Storage operations isolated; evidence gateway and canonical receipt return 404 to the other approved tenant. |
| 13 | Storage approval | PASS: 132 integrated live checks including approval states, direct Storage, gateway and tenant isolation. Direct byte/signing access is denied even to approved customer tokens; approved owners download through the revalidating gateway. Cached direct-download behavior was discovered and fixed, not ignored. |
| 14 | Client-claim bypass | DENIED: forged approval/admin/role/owner/workspace/tenant/authority metadata never overrides database approval or tenant checks; caller-supplied model approval also rejected. |
| 15 | Workspace bootstrap | Customer creation denied before approval. Approved creation and owner membership are one database transaction. Historical preapproval workspace rows remain inaccessible. Separate application membership insert removed. |
| 16 | append_trust_event_v1 provenance | Production matched `20260822124942_repair_production_consent_event_metadata.sql`; additional Staging behavior came from archived `20260816135031_staging_repair_append_trust_event_consent_namespace.sql`. Exact observed definitions and hashes retained in the provenance JSON. |
| 17 | Canonical function decision | Preserve supported consent normalization and chronology; strengthen null-safe service-role, required fields, sequence and tenant checks. Trusted gateway retains cryptographic verification responsibility. |
| 18 | Function reconciliation | PASS: new forward migration applied only to Staging; all six new local SQL files match recorded migration statements; projected Production matches Staging. |
| 19 | Remaining schema differences | Zero unresolved material application-catalog differences. Remaining compared differences are one exact managed helper and two exact CHECK-expression grouping variants. Physical column order is intentionally not an application contract. Original 1,360 differences individually classified and resolved. |
| 20 | Target schema equivalence | PASS across twelve catalog sections: observed Production baseline + all twelve pending migrations = canonical contract = observed Staging. Disposable PGlite catalog reconstruction, not a native backup restore or blank Supabase rebuild. |
| 21 | Production migration delta | Production ledger remains 119; twelve pending = original six + new six; target ledger 131. Staging ledger 147 includes archived environment history and is not expected to have identical historical row count. |
| 22 | Targeted regression | Core closure: 18 executions, zero failures/skips. Integrated hosted security: one invocation, 132 checks, zero failures. Additional native/gateway/Gamma proof is recorded separately. |
| 23 | Full regression | **1,993 executions / 88 invocations / 0 failures / 0 skips / 0 cancellations**. Typecheck passes. Full lint has zero errors; scratch-file warnings are recorded locally, and changed source/test lint passes without warnings. |
| 24 | Golden ALLOW | PASS: verified native identities/delegation, controlled approved model and matching runtime; public Gamma signed identity/authority/heartbeat also reaches ALLOW. |
| 25 | Golden REVIEW | PASS: unknown/expired model evidence and governed public Gamma review; review resolution requires a new evaluation. |
| 26 | Golden DENY | PASS: failed runtime, unapproved/revoked/conflicted/tampered model evidence, invalid/revoked public authority. |
| 27 | DENY execution count | **0** in all five execution request/acknowledgement/outcome tables checked, for native DENY cases and both public Gamma DENY transactions. No DENY execution authorization issued. |
| 28 | Receipt | PASS: fresh receipt retrieval, canonical digest, wrong-tenant denial; historical approved receipt remains unchanged after revocation. |
| 29 | Replay | PASS: native decision-time model state and public API event replay; historical state remains APPROVED while current model is REVOKED. |
| 30 | Trust Memory | PASS: fresh hosted timeline contains 49 memory entries; chronology/append-only invariants pass. Sixteen qualification transactions retained after credential/account revocation. |
| 31 | API Product Truth | Core API **RC_QUALIFIED / PROVEN_STAGING** within controlled qualification scope. No PROVEN_PRODUCTION claim. Gamma outcome is AGENT_ASSERTED, not independent destination execution proof. OpenGraph, Judge.me and World ID remain PROVIDER_UNQUALIFIED. |
| 32 | Recovery connection | Existing Production database password plus exact direct host or dashboard-provided session pooler, port 5432; PostgreSQL 17.11 native tools. No credential reset/new role. |
| 33 | Keith manual recovery action? | **YES** — existing database password and compatible isolated restore environment are still required. The completed Staging service-role/Vercel handoffs do not supply a Production database password. |
| 34 | Exact manual recovery action | Retrieve existing password from the authorized password manager and host from Supabase project `kecgtsfibkypjuaxqbjx` → Connect. Run `tools/release/backup-production.ps1` locally with the host; enter password only at the hidden prompt. Do not paste credentials in chat or arguments. Full command and session-pooler fallback are in the recovery procedure. |
| 35 | Logical backup procedure | **CONDITIONAL**: script prepared and parsed; native 17.11 clients available. Restricted artifact directory outside repository, archive-list checks and SHA-256 manifest. No actual Production dump yet. |
| 36 | Restore validation | Restore only to a new isolated Supabase-compatible PostgreSQL 17.11 database; validate schemas, data counts, functions, triggers, constraints, ACLs and migration ledger. Storage bytes need a separate private backup/checksum. Actual restore remains unperformed. |
| 37 | Secret scan | **PASS after explicit review**. Raw scoped scanner reports two findings: environment-reference function call false positive and synthetic test literal. Broad changed-file review also identifies a cookie-name literal, not a credential. No real secret in candidate files. Three qualification credential exports removed; DPAPI handoff remains encrypted outside the repository. |
| 38 | Replacement RC created | **YES**, the enclosing release commit; qualification completed before commit. |
| 39 | Replacement RC SHA | Exact enclosing commit SHA reported in final handoff; resolve with the command above. |
| 40 | Commit message | `fix(core): close approval boundary and canonical schema qualification` |
| 41 | Production database mutations | **NONE** |
| 42 | Production account mutations | **NONE** |
| 43 | Production deployment | **NONE**. Still `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`, SHA `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`; checked through the Production hostname. |
| 44 | Remaining Core blockers | No Staging RC qualification blocker. Production promotion remains blocked on validated fresh backup/restore, preserved backup of its one evidence object, retirement of preexisting direct/signed Storage cache paths, and a separately authorized promotion. |
| 45 | Non-Core limitations | Provider qualification remains absent; controlled runtime/model fixtures are not live attestations. Public signup attempt returned upstream HTTP 504; qualification used explicitly authorized Staging fixture creation. External destination outcome is not independently proven. |
| 46 | Post-GO queue | Retained in full below; none implemented here. |
| 47 | DEFAULT-DENY | **PASS** |
| 48 | TARGET SCHEMA EQUIVALENCE | **PASS** |
| 49 | STAGING CORE QUALIFICATION | **PASS** |
| 50 | RECOVERY PROCEDURE READY | **CONDITIONAL** |
| 51 | REPLACEMENT RC STATUS | **CREATED** by the enclosing release commit; working tree checked clean afterward. |

## New forward migrations

1. `20261007150222_account_approval_default_deny.sql`
2. `20261007150224_canonical_trust_memory_function_reconciliation.sql`
3. `20261007150835_canonical_workspace_bootstrap.sql`
4. `20261008093614_canonical_application_access_grants.sql`
5. `20261008105722_canonical_application_schema_reconciliation.sql`
6. `20261008112858_evidence_download_approval_revalidation.sql`

Qualified Staging Preview: `dpl_HKxdiGXUsr7eUX5hUDBr55t7mE8e`, served at `https://staging.cybersentinels.com`. This was a working-tree build before the replacement commit; its deployment metadata is not misrepresented as containing the later commit SHA.

## Retained post-GO queue

1. Website Truth Synchronisation + Content Deduplication.
2. AgentPass — extract, don't fork.
3. Location Assurance.
4. Identity Continuity.
5. Human Identity ↔ Device ↔ Operator ↔ Location ↔ Authority.
6. Agent Identity ↔ Runtime ↔ Workload ↔ Region ↔ Authority.
7. Trust-to-Provision.
8. TrustReplay.
9. Sentinel control architecture.
10. OpenGraph live-provider qualification.
11. Judge.me qualification.
12. World ID live-provider qualification.
