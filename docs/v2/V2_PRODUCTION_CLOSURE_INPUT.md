# V2 Production Closure input — 10 September 2026

Preparation is complete; **Production promotion is NOT AUTHORIZED**. V2 foundation and Epic 1 remain Staging-qualified. The exact-main candidate has outstanding homepage reconciliation and dependency security gates. This document does not grant a V2 Production GO or supersede the established V1 release verdict.

## Candidate and preserved history

- Application candidate and remote main reviewed: `1a6699e05cb6bfbc1d36381cbe196e0fd94a14ef`.
- Release branch: `release/v2-production-closure`, created from that exact SHA in `C:/Users/emeae/Desktop/cyber-sentinels-v2-release`. Any following commit in this preparation contains documentation/evidence only; application source, dependency locks and migrations are unchanged.
- Historical worktree: `C:/Users/emeae/Desktop/cyber-sentinels-clean`, branch `fix/homepage-worldid-v1-closure-20260906-141022`, HEAD `b72955f09c2ccc5558b53771f7680647a0f734b8`. Its original files, dirty state and stashes are preserved.
- External archive: `C:/Users/emeae/Desktop/cyber-sentinels-v1-archive-20260910-144900`; `ARCHIVE_MANIFEST.md` and JSON record source/archive paths, byte counts and separate SHA256 hashes. All 109 selected files were scanned before copying. Initial alerts in nine files were reviewed as public Ed25519 fingerprints, non-authenticating prefixes, public client UUIDs and backup-hash prose; no credentials were identified. Exact safe copies and initial conservative redacted copies are retained.
- All 71 modified/untracked files were classified: 59 already in main, three differing historical implementation/configuration files, six obsolete generated outputs, three valuable historical authored reports. See [classification](closure-20260910/v1-file-classification.json) and [reconciliation](closure-20260910/archival-reconciliation.json).
- The three reports are preserved, explicitly superseded, on `archive/v1-production-evidence-20260910`, commit `7146f71`, [draft PR #87](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/87). No current V1 report was overwritten and no generated artifact was added merely because it existed. Publication retains a conservative backup-prose/hash redaction; exact original safe bytes remain in the external archive.

## What exact main contains

| Requirement | Evidence at candidate |
|---|---|
| V2 foundation / Epic 1 | PR #86 merge `2b33157`; foundation `2b6a421`; integrity fixes `5e899ad`; `lib/operational-incidents/{model,server,openapi}.ts`, `app/dashboard/incident-evidence`, `app/api/v1/incidents` |
| Additive V2 migration | `supabase/migrations/20260909163513_operational_incident_evidence_foundation.sql` |
| V2 readiness / architecture | `docs/v2/V2_RELEASE_READINESS.md`, `V2_DATA_MODEL.md`, `V2_PRODUCT_ARCHITECTURE.md`; documentation `98917f0` |
| V2 API and scopes | `lib/operational-incidents/openapi.ts`, `lib/public-api/v1/openapi.ts`, `lib/public-api/v1/contracts.ts` |
| V1 release/security | Approved `b0f6b37` is an ancestor; heartbeat error contract fix `f584413`; final evidence `192126f`/`c1756a3`, merged by #83 |
| Next.js security update | `28a4888` / #44: Next.js and eslint-config-next `15.5.25` |
| Development tooling | `00441e2` / #68, `package.json` and lockfile |
| Supabase CLI | `1a6699e` / #46: `2.116.0` |
| Earlier homepage hero/payment example | Present in `app/page.tsx`; most recent main page commit `5081b4a` |
| Later homepage / Developers navigation / loading correction | **ABSENT**: changes `dd0c682` and `61b9701` remain on `v2/operational-trust-intelligence`, whose reviewed head is `958b9eff1e058dae2b59dfc32d0a947c8bfd12f7`. They were committed after the #86 merge. No silent cherry-pick or redesign was performed. |

The prior readiness document's statements that PR #86 is unmerged are historical. This input records the actual merged state and distinguishes the unmerged follow-up homepage work.

## Local qualification

Fresh Node `22.23.1`, npm `10.9.8`, lockfile `npm ci`: PASS. Full `npm test`: **1,514 PASS, zero failures/skips/TODOs**. Lint, typecheck and optimized Next.js build: PASS. No tests removed and no application source changed. [Validation](closure-20260910/local-validation.json).

Gitleaks reviewed the approved V1 SHA through candidate with existing exact public-identifier fingerprint triage and found zero unignored leaks. The supplementary current-tree scoped scanner also completed. Fresh evidence is separately scanned before commit; no `.env.local`, API keys, private keys, service credentials or auth-cookie exports belong in this pack.

The clean install succeeds but **does not establish a clean dependency security audit**. [Fresh npm audit](closure-20260910/dependency-audit.json) identifies three distinct advisories (with transitive/metavulnerability entries):

- High: `sharp` `0.35.3`, propagated through Next.js. [Maintainer advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) covers vulnerable libheif handling of untrusted input; patched sharp is `0.35.4`. Runtime reachability has not been established or ruled out. Treat as a P1 closure gate pending a focused update or documented applicability assessment.
- High: `js-yaml` `4.3.1`, used by ESLint tooling; [advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh), patched `4.3.2`. Development-tool exposure is distinct from deployed application exploitation; resolve in focused dependency qualification.
- Low: `postcss-selector-parser`; [advisory](https://github.com/advisories/GHSA-w9m9-85wc-3x92). P2 dependency debt.

No automatic audit fix or dependency update was mixed into this read-only release-preparation review.

## Database delta and safeguards

[Database review](closure-20260910/database-review.json), [Staging ledger](closure-20260910/staging-database.json), [Production ledger](closure-20260910/production-database.json), and catalogs are fresh read-only observations.

| Check | Result |
|---|---|
| Staging `agpyhygpfmppjkxwcpac` | 131 entries; exactly matches the previously qualified version/name/statement-SHA256 ledger |
| Production `kecgtsfibkypjuaxqbjx` | 114 entries; every historical version/statement MD5 matches committed final V1 Production evidence |
| Expected environment-specific queues | Staging 131; Production 115 = canonical queue plus five preserved Production history files |
| Unexpected versions | **0** in either environment |
| Sole pending Production migration | **`20260909163513_operational_incident_evidence_foundation.sql`** |
| V2 table/RPC | Present in Staging, absent in Production; new constraints validated, RLS enabled, RPC denied to anon/authenticated and granted to service_role |
| Historical migration source changes | None relative to approved V1; only the new V2 migration appears in the migration diff |
| Production database mutation | **NONE** |

The raw cross-environment set contains 22 Staging-only and five Production-only versions, plus historical statement-byte differences. These are preserved environment histories/aliases, **not 22 pending Production migrations**. Do not feed the Staging archive into Production or rewrite existing ledger entries. World ID's historical canonical migrations are already recorded in Production and its nullifier table exists; Staging also retains its original timestamp aliases. This does not prove real-human provider execution.

V2 remains forward-only and reuses the existing incident, outcome, evidence, Replay, Memory, graph and canonical transaction structures. `incident_evidence_links` is the only new V2 table. Shared changes: `incident_regulatory_assessments.evidence_mode` and conditional legacy context constraint; composite evidence uniqueness; extended API-key allowed scopes; restricted atomic `persist_operational_incident_v2` RPC. No existing API-key scopes are upgraded. This is additive but has shared-schema risk; preserve a fresh recovery point before eventual authorization.

Five historical NOT VALID constraints remain disclosed in both databases: `evidence_objects_epic18_integrity`, `evidence_objects_freshness_policy_check`, `evidence_objects_superseded_by_fk`, `canonical_trust_transaction_events_event_type_check`, and `canonical_trust_transactions_decision_outcome_review_check`. Prior qualified data audits found zero violating rows. This review confirms their flags without validating or repairing them, and does not represent prior row audits as fresh checks.

Future migration preparation must use the environment-specific context generated by `tools/release/prepare-migration-context.mjs production`. Only after separate authorization and rechecking the exact live ledger may a Production dry run/apply proceed. Require **exactly the one V2 file** and stop on any different list. No link, repair, push, constraint validation or DDL against Production was executed here.

## Environment and Vercel state

The source environment delta from V1 is only `CONTROL_PLANE_STAGING_QUALIFICATION=false` in `.env.example`. Its runtime guard requires both Staging mode and the exact Staging database origin. **No new V2 Production secret or enabled flag is required.** Preserve existing V1 Production signing/auth/origin settings; never copy Staging fixture secrets or enable the Staging qualification flag in Production. Live secret values were not exported or compared, so this is a source-required delta rather than a claim to have requalified every current Production credential.

Actual Production domain/alias inspection resolves to **`dpl_3yX9aPfmjumxNH2DS56dnzTFL7zc`**, SHA **`b0f6b37d41714efa940852b3ef955e9c7317c513`**, READY. `www.cybersentinels.com` and `cybersentinels.com` remain on approved V1. No alias, environment, deployment promotion or Production database state was changed by this task.

Main auto-deployment is disabled in `vercel.json`. No deployment of exact main `1a6699e` appears in the recent Vercel history covering its merge. The latest dependency Preview observed before archival publication was `dpl_2oS7PR38KmWtLFS1Dt4nEKZ7VWaJ`, SHA `1fac6d39ef31ca98c03fec7053a0d8041ae7ecc5`; that is a dependency branch, not exact main. The V2 homepage Preview tested is **`dpl_BDxaeChb2yQTczjENjPajvV7Hhvx`**, SHA **`958b9eff1e058dae2b59dfc32d0a947c8bfd12f7`**. The archival branch creates its own non-Production Preview; it must not be confused with the release candidate. See [deployment snapshot](closure-20260910/deployments.json).

V1/V2 mutation tests ran on `https://localhost:3443` using candidate source with **only the Staging database**, not on a potentially Production-bound Preview. Preview browser checks blocked all non-GET/HEAD requests. No demo form was submitted.

## API delta

OpenAPI remains 3.1.0, API version `2026-08-29`, 25 paths / 26 operations. Five V2 operations are additive:

| Operation | Scope |
|---|---|
| POST `/api/v1/incidents` | `incidents:write` |
| GET `/api/v1/incidents/{incidentId}` | `incidents:read` |
| POST `/api/v1/incidents/{incidentId}/chronology` | `incidents:write` |
| GET `/api/v1/incidents/{incidentId}/replay` | `incidents:read` |
| POST `/api/v1/incidents/{incidentId}/exports` | `evidence:export` |

Existing evidence/outcome operations retain their V1 scopes. New keys must explicitly request the required V2 scopes. Server-derived state, canonical references, tenant ownership, evidence digests and attribution remain enforced.

## Fresh Staging evidence

[Customer zero](closure-20260910/customer-zero.json): agent registration, Ed25519 credential/manifest/challenge/proof, verified identity, bounded authority, signed heartbeat, **ALLOW**, persisted transaction/receipt/Replay, observations, incident/chronology/evidence links/outcome/intervention/containment/remediation, export, revocation and **DENY** all PASS. No V2 context existed before the first ALLOW. Original transaction/digests stay unchanged after V2 and revocation. Challenge/heartbeat replay, unknown references, cross-tenant calls, wrong digest and caller-forged verification are rejected.

[Application proof](closure-20260910/application-proof.json): authenticated receipt, Outcome Review linkage, graph, persisted Trust Memory and desktop/mobile incident UI PASS. Original ALLOW and later adjudicated DENY / CONTRADICTED coexist without history rewriting. [Tenant/scope proof](closure-20260910/tenant-scope-proof.json) proves cross-tenant transaction, incident, Replay, authority, outcome and evaluation rejection, indistinguishable absent/inaccessible responses, and 403 on all five V2 operations for a newly issued legacy-scope-only key. It is not represented as a historical pre-migration key.

[Additional proof](closure-20260910/additional-proof.json) covers cross-tenant evidence, missing evidence, forged authority fields, existing outcome persistence, reviewed export and two actual attribution sources (first-party control plane plus API-client assertions). Their incomplete correlation correctly remains DRAFT with explicit missing categories. **No independent external provider or downstream execution was exercised.** Cross-provider context is WORKING foundation within that boundary, not global intelligence.

[Stored export integrity](closure-20260910/stored-export-integrity.json) independently recomputes the actual persisted package digest: PASS, seven evidence references, original ALLOW and CONTRADICTED review. [Authenticated RLS](closure-20260910/authenticated-rls.json): owner sees eight links; other tenant sees zero under real fixture user claims and the authenticated role. Queries were read-only and rolled back. Catalog confirms restricted RPC grants.

[Cleanup](closure-20260910/key-cleanup.json): all three temporary API keys revoked and subsequent requests return 401 `API_KEY_REVOKED`; bounded authority is revoked. Scripted immutable test evidence remains in Staging for audit, not as customer/provider execution proof.

Purpose Lineage remains **PARTIAL**. No drift interpreter, automatic policy action, new Epic 2 feature or Operational Trust Intelligence engine was built.

## Homepage and P2

[Exact-main browser review](closure-20260910/main-homepage-visual.json): desktop/mobile hero and €20,000 versus €10,000 DENY example PASS, no horizontal overflow or captured page exception. The example distinguishes verified identity from bounded authority; the later explicit explanatory treatment is absent. Developers header navigation FAIL; demo CTA reaches “Become a Design Partner” instead of the requested demo form; API CTA reaches the developer landing page rather than `/developers/docs`; V2 after-decision and Trust Memory story FAIL. These are the missing post-merge changes, not a newly introduced source regression in this task.

[Existing V2 Preview review](closure-20260910/v2-preview-homepage-visual.json): six widths (390–1440), keyboard navigation, Developers header, demo form and API docs PASS; zero axe violations, overflow, measured CLS or captured page errors. The visual fixture rejects optional cookies only in browser storage and makes no server consent claim. This qualifies `958b9ef`'s homepage only, not `1a6699e`.

Intermittent hydration P2 was not reproduced on these checks; **it is not claimed fixed**. The known loading-height correction also remains outside main. No homepage redesign or speculative hydration fix was performed. Browser console follow-up is retained in [console evidence](closure-20260910/browser-console.json); local development warnings must be distinguished from an actual React hydration exception.

The authenticated local console reports `Admin email mismatch` with `configuredAdminCount: 0` in the deliberately non-admin fixture environment, plus a failed resource request while the read-only browser harness blocks writes. Page-error arrays are empty. The console is therefore not claimed error-free; neither message is evidence of a React hydration failure. No admin allowlist was added merely to suppress a fixture warning.

## World ID

**IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED.** No World ID code, configuration, provider flow or migration was modified or exercised during this preparation.

## Rollback and future Production proof — DO NOT RUN under this authorization

Before closure, reconcile the missing homepage follow-up and resolve the dependency gates in focused review, select an exact new candidate SHA, and repeat impacted qualification. Obtain explicit Production authorization covering the final migration, exact deployment, credentials and bounded proof. Reinspect aliases, environment bindings, schema, ledger and a fresh recovery point; never assume this snapshot remains current.

The separately authorized sequence is:

1. Pin exact candidate SHA and approved single forward migration; verify recoverability and dry-run delta.
2. Apply that approved V2 forward migration to Production, verify catalog/RLS/grants and preserve all historical entries.
3. Deploy the exact approved SHA; verify deployment metadata, health and actual aliases/environment binding.
4. Issue a fresh narrowly scoped, expiring Production V2 API key through the normal owner flow.
5. Register the external agent, prove Ed25519 possession, establish bounded authority and execute V1 ALLOW.
6. Create incident, append chronology, link evidence, record outcome/intervention/remediation and produce a digested evidence export.
7. Verify persisted receipt, Replay, Trust Memory and Outcome Review linkage where applicable; retain original decisions.
8. Revoke authority, repeat the action and require DENY.
9. Prove tenant-isolation, invalid-digest and legacy-key/V2-scope negatives, then recovery behavior.
10. Revoke every temporary credential, verify 401, and retain bounded evidence. Only then consider a V2 Production verdict.

If application promotion fails, restore the approved V1 deployment/aliases through the separately authorized rollback procedure. Keep the additive database history and stop/revoke V2 writers; do not drop evidence, remove ledger entries or destructively reverse the migration. Use a reviewed forward correction for schema defects. Record who executed recovery, which SHA/alias was restored and how V1 lifecycle was reverified. A rollback strategy is not a fresh restore rehearsal.

## Readiness verdict

- V1: CLOSED / existing Production GO at `b0f6b37`; fresh candidate Staging regression NONE.
- V2 foundation / Epic 1: READY for the defined Staging scope; incident/export/Replay/Memory WORKING.
- Local reconciliation: COMPLETE; original worktree preserved; archival PR awaiting review.
- Release worktree: READY as a clean, documented preparation branch; candidate promotion remains BLOCKED by missing homepage reconciliation and dependency security review.
- Database: READY FOR PRODUCTION CLOSURE planning; sole forward delta identified, no authorization to apply it.
- P0: none identified in this scoped review. P1: missing expected homepage follow-up; unresolved high dependency findings before promotion. P2: intermittent hydration, five historical NOT VALID flags, low dependency advisory, explicitly partial purpose interpretation and independent-provider qualification.
- **Production promotion: NOT AUTHORIZED.** No V2 Production GO, Epic 1 Production execution, World ID Production execution, real external-provider execution, regulator certification, AI Act compliance, specialist model or global cross-provider intelligence is claimed.
