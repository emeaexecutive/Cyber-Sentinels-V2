# Cyber Sentinels V1 release-candidate qualification

Generated: 2026-08-26  
Decision: **not a staging-qualified V1 release candidate**  
Final main SHA: `645945ff18bed601753a2b2595d6d3759298f11a`

## Executive decision

The frozen V1 architecture and Model State Integrity change are consolidated on main, reviewed, tested, and merged. The real Staging database has the two required V1 schema effects with tenant RLS and service-role-only artifact writers. Production was neither migrated nor deployed.

Release closure stops at the application-staging boundary. The exact-main Vercel Preview is bound to the Production Supabase project (`kecgtsfibkypjuaxqbjx`) instead of Staging (`agpyhygpfmppjkxwcpac`). Only read-only health/readiness probes were sent. No synthetic user, tenant, canonical transaction, fault, load, or provider proof was attempted against that deployment.

This is therefore `V1_ARCHITECTURE_CONSOLIDATED__STAGING_APPLICATION_QUALIFICATION_BLOCKED__PRODUCTION_UNAUTHORIZED`.

## Immutable safety record

- Production deployment `dpl_7Zyhf51a2JF2wnWMg1BDAMBDjVq1` remains READY at SHA `a4385dbf92488761714f805cd233ec81b6a7ee84`; no Production deployment was created.
- Model State Integrity commit `bdd1aa57c6c30f1c717a2a74cf4e25a92e885cec` is an ancestor of final main.
- PR #71 merged as `645945ff18bed601753a2b2595d6d3759298f11a` only after required CI passed.
- No Dependabot PR was merged. No branch or evidence was deleted.
- `tools/production-proof-local.mjs` remains SHA-256 `94EE263EB245E07943664BF8AC37BA40DADEB82BF756E61DEF7435ED1A2F9C1D`.
- `artifacts/production-proof.json` remains SHA-256 `1BC1ED6FD53A5E9606A42107620A7CD5727DF509AB001016F0D95813BBC254AF`.
- The two frozen proof files remain outside all release commits.

## V1 capability inventory

| Capability | Source commit | Primary files | Tests | Migration | Main | Staging | Production |
|---|---|---|---|---|---|---|---|
| Authority Integrity / Authorization Propagation | `b69a31ad` | `authority-integrity.ts`, canonical evaluator | authority-integrity, canonical | `20260824181053` | Present | DB qualified; live app blocked | New V1 state absent |
| Trust Forecast / Pressure / Budget | `b69a31ad` | `trust-forecast.ts` | trust-forecast | `20260824184543` | Present | DB qualified; live app blocked | New V1 state absent |
| Trust Twin / Counterfactual | `b69a31ad` | `trust-twin.ts`, Twin APIs | trust-twin-counterfactual | `20260824184543` | Present | Live app blocked | New V1 state absent |
| Adaptive Verification / Trust Gaps | `b69a31ad` | `adaptive-verification.ts`, coverage API | adaptive-verification | None | Present | Live app blocked | New V1 state absent |
| Sentinel Agents | `b69a31ad` | Sentinel library/server/API | sentinel-agents | None | Present | Live app blocked | New V1 state absent |
| Model State Integrity | `bdd1aa57` | `model-state-integrity.ts` | MSI, canonical | None | Present | Local/CI only | Absent |
| Provider-neutral evidence | `22780dfd` | federated evidence, adapters | provider neutrality/portability | None | Present | Live conflict proof blocked | Not requalified |
| Canonical evaluation / receipts | `f599f69e` plus V1 extensions | canonical evaluator/server | canonical unit/integration | `202608060002` | Sole decision authority | Schema present; live transaction blocked | Not MSI-qualified |
| Evidence Graph / Trust Memory | `6b67dc08` plus V1 extensions | enterprise architecture migration | architecture/RLS | `202607210001` | Present | Schema/RLS qualified; live references blocked | Not V1-requalified |
| Replay | `03cc55a0` plus V1 extensions | replay migration | replay unit/integration/RLS | `202606080003` | Present | Schema/RLS qualified; live reference blocked | Not V1-requalified |
| VALE/entity support | `053e4d95` and operational-entity foundation | operational entities | VALE/provider adapters/entity | None | Present | Live HUMAN/agent/workload/machine/robot matrix blocked | Not V1-requalified |

The consolidated V1 feature commit is `b69a31adbac0ed72818624ae9a26498bcd07c49a` (29 files, 6,577 insertions). Model State Integrity adds 14 files/updates and 1,072 insertions through `bdd1aa57c6c30f1c717a2a74cf4e25a92e885cec`. Other unmerged historical, WIP, dependency, backup, and product branches remain preserved; none was silently merged into this frozen release.

## Architecture and Model State Integrity review

Review confirmed that Model State Integrity extends the existing canonical Trust Fabric. It does not create a parallel evaluator, graph, identity system, evidence store, or runtime-security engine. The canonical evaluator remains the sole decision authority. Forecast, Twin, Sentinel, and verification outputs remain derived/non-authoritative; verification cannot grant authority. No model weights, raw proprietary template bodies, credentials, or secrets are persisted.

Targeted results:

- Model State Integrity: 15/15 PASS.
- Canonical Trust Transaction suite: 133/133 PASS.
- Release-qualification guard: 11/11 PASS, including fail-closed Preview-to-Production binding.
- Security tooling contract: 3/3 PASS.
- Staging ZAP configuration guard: 3/3 PASS.

PR CI on Node 22 passed lint, typecheck, full `npm test`, production build, Production Verification, CodeQL, Gitleaks, and Vercel Preview. The PR Supabase Preview check was skipped by entitlement and is not counted as PASS. The exact-main release branch subsequently produced a real Supabase Preview failure: `Remote migration versions not found in local migrations directory.`

## Migration identity and Staging database

No migration was applied in this sprint. Model State Integrity needs no migration.

| Repository migration | Staging ledger entry | Repository SHA-256 | Staging SHA-256 | Byte-identical | Semantically equivalent |
|---|---|---|---|---|---|
| `20260824181053_authority_integrity_authorization_propagation.sql` | `20260825175059 authority_integrity_authorization_propagation` | `16b40a25d19a8e794d55857454b2261d257b7d51d13aa6822137055efc9235c2` | `ec4e81ce01c0acd922aa8d0574f7afa1d258dd4319c308797113a9bfecb81c8b` | No | Yes |
| `20260824184543_trust_forecast_operational_intelligence.sql` | `20260825175143 trust_forecast_operational_intelligence` | `228dbdde107ea05359bbc1d1db46bb312c51dca902bc52084e914d22ab3dcca4` | `da6772eab65881db17db822770c4faf1e963d7e98a82745d8ea51b19f6a8c7e4` | No | Yes |

The only byte difference is a terminal LF present in each repository file and omitted from the single SQL statement in the Staging ledger. Removing only that LF produces the exact Staging byte count and SHA-256. The schema, RLS, function, and security effects are therefore equivalent; duplicate migrations must not be created to align timestamps.

The following Staging tables have RLS enabled with tenant-scoped read policies: canonical transactions/events, graph nodes/edges, Replay, and Trust Memory. The graph/replay/memory extension functions use `SECURITY DEFINER`, `search_path=""`, reject `anon` and `authenticated` execution, and permit only `postgres`/`service_role`.

Supabase reports 21 project-wide, pre-existing security advisories. None targets the six tables or three functions above, but the remaining debt includes 16 RLS-without-policy INFO notices, three authenticated-execution warnings on other security-definer helpers, leaked-password protection disabled, and insufficient MFA options. Performance advisor debt also remains, including the canonical previous-transaction foreign key without a covering index.

## Exact-main deployment and environment stop

Candidate deployment:

- Deployment ID: `dpl_HdTXNR4GaXExJZCayyZFs4zwAzvW`
- URL: `https://cyber-sentinels-v2-goroqsa5d-keith-speres-projects.vercel.app`
- Vercel state: `READY` (Preview target)
- Deployment metadata SHA: `645945ff18bed601753a2b2595d6d3759298f11a`
- Final main SHA: `645945ff18bed601753a2b2595d6d3759298f11a`
- SHA metadata match: yes
- Vercel `gitDirty=1`: the isolated worktree was clean at final main before Vercel link generated ignored metadata/environment files and appended its ignore entry.

The Vercel project has only Production, Preview, and Development targets; there is no custom Staging target. Preview resolves `NEXT_PUBLIC_SUPABASE_URL` to Production ref `kecgtsfibkypjuaxqbjx`. This fails the repository's own `PREVIEW_BOUND_TO_PRODUCTION` release guard. It is not a valid Staging deployment even though its Git SHA metadata matches final main.

## Health and observability probes

Two read-only calls were made before the environment binding was known:

- `/api/health`: HTTP 200, `status=ok`, empty `release_version`, request `nf48r-1787753527758-57bfd3dda131`, trace `41f0c7d7ff838a0071c51f7d14d3ecf3`.
- `/api/ready`: HTTP 200, `status=READY`, `runtime.commitSha=null`, `repositoryRuntime=NOT_CONFIGURED`, `externalControls=BLOCKED`, reason `AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED`, request `rlb6q-1787753551806-5a4c4c67df08`, runtime trace `ab00ad2c1aae85a8d0a0bf794be7d6d9`.

Vercel runtime logs correlate both requests and 200 responses. These probes do not count as Staging health, release-SHA proof, full observability, or application qualification because the deployment has the wrong data-plane identity.

## Mandatory live evidence status

All of the following are **not proven live** and were deliberately not attempted after the stop rule fired:

- Canonical persisted ALLOW and DENY (`AUTHORITY_SCOPE_INVALID`) transactions and their receipt/Graph/Replay/Memory references.
- Approved, drifted, approved-change, provider-conflict, and restored Model State Integrity cases.
- Sentinel observation/investigation with `SENTINEL_DECISION_AUTHORITY=FALSE`.
- Forecast deterioration/recovery, Trust Pressure/Budget changes, Twin NOW→CHANGE→PROJECTED STATE, and non-executing counterfactual output.
- Adaptive verification, revalidation/runtime-attestation request, and Trust Gap OPEN→RESOLVED.
- Authorization propagation and stale/downstream authority behavior.
- VALE behavior across HUMAN, AI_AGENT, SOFTWARE_AGENT, WORKLOAD, MACHINE, and ROBOT.
- Two-provider corroboration/conflict and a real-provider status. No commercial provider integration is claimed.
- Two-tenant denial/not-found behavior across all V1 artifacts.
- API authentication, authorization, scoping, invalid request, rate-limit, error, and correlation contracts against Staging.
- SDK deployed happy path. SDK status is local-test-only.
- Clean onboarding rehearsal; founder intervention count is unmeasured, not zero.
- Controlled failure, end-to-end telemetry chain, component performance percentiles, and resilience cases.
- Live application security, cross-tenant, CSRF/origin, request validation, and rate-limit proof.

Unit and CI evidence is retained but is not substituted for any live criterion.

## Performance, resilience, and security

No bounded performance run was executed because no safe deployed Staging target exists. Consequently p50/p95/p99, sample count, and environment-specific latency claims are unavailable. No provider outage/disagreement/staleness or model-state uncertainty scenario was injected. No ZAP scan was sent to the Production-bound Preview.

Static and CI security checks passed, and live Staging database object boundaries were inspected. Application security remains incomplete until the isolated Staging deployment supports real tenant sessions and synthetic transactions.

## Production recoverability

At 2026-08-26 the Production Supabase project is `ACTIVE_HEALTHY`, but that is not recoverability proof. Current evidence state:

- Backup capability: not established with owner/platform evidence.
- Fresh recovery point: absent.
- Recovery procedure: documented only.
- Isolated restore rehearsal or equivalent proof: absent.
- Evidence timestamp for a successful restore: absent.

Production migration and deployment authorization is therefore **NO**.

## Required closure work

1. Configure a genuinely isolated Vercel Staging/custom environment bound only to Supabase `agpyhygpfmppjkxwcpac`; never reuse Production secrets or URLs.
2. Deploy final main from a clean source package and expose the exact SHA through both health/readiness contracts.
3. Reconcile Supabase migration-version identity without duplicating schema effects.
4. Execute and retain every P8-P24 live artifact, including two-tenant denial, canonical receipts, performance samples, and controlled failure correlation.
5. Resolve or formally accept relevant Supabase advisor debt.
6. Establish a fresh Production recovery point and complete an isolated restore rehearsal.
7. Re-run the release decision. Do not promote the current Preview.

## Evidence score

Strict score: **32%**. Nine closure sections are fully evidenced out of P0-P27: safety, consolidation, MSI review/commit, CI, merge, migration identity, Staging database state, machine-readable manifest, and human-readable evidence. Partial or wrong-environment results receive no credit. A 100% claim is prohibited until every mandatory live and recovery criterion is proven.
