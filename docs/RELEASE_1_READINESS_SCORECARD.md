# Release 1 readiness scorecard

Release candidate: 1.0 RC2
Review date: 2026-07-16

## Evidence scale

Scores are evidence states, not estimated percentages.

- `0 — Absent`: no product or documented contract.
- `1 — Designed`: bounded design or interface exists.
- `2 — Implemented`: working repository path and tests exist.
- `3 — Pilot evidenced`: a design-partner workflow has retained reviewed evidence.
- `4 — Production evidenced`: deployed controls, representative use and operational ownership are verified.

No score advances from configuration alone. Missing provider, dataset, deployment or review evidence remains a blocker.

Historical mapping: Architecture and Governance are consolidated into Operational Readiness; Provider Integrations is now Provider Readiness; Runtime Performance is now Performance.

| Area | Current score | Target | Blockers | Evidence | Next milestone |
| --- | --- | --- | --- | --- | --- |
| Enterprise UX | `2 — Implemented` | `3 — Pilot evidenced` | Authenticated cross-browser and design-partner usability evidence are not recorded; in-app browser QA was unavailable in this review. | Six-section homepage, canonical public-page adoption contracts, four guided buyer journeys, consolidated navigation and a 16.8-second accessible trust flow. | Complete desktop/mobile buyer walkthroughs with one design partner and retain findings. |
| Operational Readiness | `2 — Implemented` | `3 — Pilot evidenced` | Deployed tenant, queue, database, Replay and Trust Memory evidence remain external. | Six evidence-linked readiness indicators, ten-component health model, guided onboarding, protected dashboard and deployment checklist. | Complete one tenant-scoped workflow with decision, Replay, governance and Trust Memory references. |
| Provider Readiness | `2 — Implemented` | `3 — Pilot evidenced` | No successful real provider health check or reviewed provider outcome was supplied to this review. | Provider classifications, credential state, health, latency, last successful check, normalization audit, limitations and truthful Test Connection behavior. | Validate one endpoint-specific adapter with approved pilot evidence and retained real health. |
| ML Validation | `2 — Implemented` | `3 — Pilot evidenced` | Fewer than 30 approved reviewed samples; no provider-comparison dataset. | Calibration, benchmark, reviewed-outcome, confidence-calibration and provider-agreement contracts in `lib/validation/benchmark-harness.ts`. | Add dataset-versioned, consented or approved reviewed cases that satisfy the calibration gate. |
| Security | `2 — Implemented` | `3 — Pilot evidenced` | Deployed RLS, distributed rate limiting, session policy, webhook verification and secret rotation require target-environment proof. | Protected auth/admin paths, RLS migrations, secret validation, rate-limit controls and `docs/SECURITY_REVIEW_RELEASE_1.md`. | Execute the deployment security checklist and attach denial-path evidence. |
| Performance | `2 — Implemented` | `3 — Pilot evidenced` | Measurements remain process-local; representative pilot p50/p95 and durable APM are absent. | Profiling covers orchestration, providers, database, Replay, Evidence Graph, Trust Memory and queues. | Capture versioned pilot measurements and optimize only a reproducible bottleneck. |
| Documentation | `2 — Implemented` | `3 — Pilot evidenced` | Operator and design-partner sign-off is external. | Release, security, provider, deployment, buyer, UI, Evidence Pack, pilot checklist, demo and acceptance documents. | Obtain named owner approval after credentialed production checks. |
| Demo | `2 — Implemented` | `3 — Pilot evidenced` | Machine identity and provider credentials are not part of the controlled demo. | `buildEnterpriseAdoptionDemo()` and `docs/demos/ENTERPRISE_ADOPTION_DEMO.md` define ten screens in 6.5 minutes with explicit boundaries. | Rehearse twice against the release build and retain timing plus fallback evidence. |
| Investor Readiness | `2 — Implemented` | `3 — Pilot evidenced` | No customer outcome, revenue, production accuracy or scale evidence is asserted by this repository. | Category positioning, buyer journeys, investor pack, scorecard and evidence-bounded demo. | Add one named design-partner problem, success criteria and reviewed outcome. |

## Release 1.0 blockers

1. Complete a reviewed design-partner workflow with retained decision, authority, evidence, Replay, governance and Trust Memory records.
2. Validate at least one real provider connection and reviewed outcome under approved pilot data.
3. Meet the reviewed-dataset calibration gate before accuracy-like claims.
4. Verify deployed RLS, distributed rate limiting, session expiry, webhook signatures, secret rotation and partner API scopes.
5. Capture representative pilot performance and authenticated cross-browser UX evidence.
6. Obtain operator, security and design-partner acceptance sign-off.

## 1.0 RC1 evidence-gate update — 2026-07-16

The score remains `2 — Implemented`, not `3 — Pilot evidenced`. Hopae Connect now completes the canonical evidence path in approved Test Mode with signature/timestamp/idempotency controls, provider-neutral normalization, evidence quality, authority/policy separation, enforcement, and atomic Replay/Evidence Graph/Trust Memory/receipt persistence. No credentials or successful target-environment provider health were present, so no `Live` state is claimed.

Enterprise UX now uses a six-block homepage and nine-step 16.2-second guided flow. The final performance-evidence run measured 100 in-process samples: 0.161 ms average, 0.108 ms p50, 0.348 ms p95, 10% injected unavailability and 0% execution errors. Provider/network/database performance, deployed migration/RLS denial checks, reviewed pilot evidence and operator sign-off remain blockers.

## 1.0 RC2 living-trust update — 2026-07-16

The score remains `2 — Implemented`. RC2 derives one Living Trust Profile from canonical identity, authority, credential, provider, runtime, Evidence Graph, Replay, Trust Memory, review, governance and policy sources. Trust DNA exposes contextual dimensions without a universal score. Authority attenuation, runtime reauthorization, governed control records, retention tombstones, observed-evidence queries and compliance mappings are repository-tested. Pilot evidence, integrated external control receipts, approved retention/deletion operations and target-environment checks remain absent.
