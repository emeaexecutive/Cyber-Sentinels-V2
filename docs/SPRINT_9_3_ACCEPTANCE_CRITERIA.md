# Sprint 9.3 Acceptance Criteria

## Working software

- [x] Canonical lifecycle orchestrator executes using existing engine contracts.
- [x] Allowed decision vocabulary is enforced.
- [x] Provider state requires successful real health evidence before Live.
- [x] Reviewed outcomes can contribute to history/recommendations and Trust Memory references only when attributable and eligible.
- [x] Replay, execution receipt, Evidence Graph and Trust Memory references are generated.
- [x] Existing regulated AI-agent demo shows allow, review and block paths.

## Validation and safety

- [x] 10, 100 and 500 local simulated lifecycle runs complete with measured latency.
- [x] Provider timeout/conflict, duplicate/out-of-order event, Replay failure, Trust Memory failure, governance delay and cache miss are covered.
- [x] Replay/Trust Memory write failures block execution while preserving evidence.
- [x] Dataset manifests cover 12 requested categories without customer PII or production evidence.
- [x] Precision/recall/F1 remain gated by reviewed sample, ground-truth quality and versioning requirements.
- [x] Trust Memory validates chronology, references, tenant context, attribution, reasons and append-only IDs.
- [x] Evidence Graph exposes continuity checks for missing/cross-tenant/orphan/ownership/revocation/receipt/replay/memory gaps.

## Documentation and UX

- [x] Implementation audit, provider matrix, performance baseline, Trust Memory validation and release notes exist.
- [x] Demo uses the existing public route; no public route sprawl.
- [x] Hiring remains one solution/template.
- [x] Existing navigation ownership remains unchanged.

## Release gates

- [x] `npm run lint` passed (repository-defined production build gate).
- [x] `npm run typecheck` passed.
- [x] `npm run build` passed and generated 153 pages.
- [x] Continuous validation, lifecycle, standards-readiness, ML-validation and decision-intelligence suites passed.

`package.json` has no `npm test` script; it was not invented. The relevant named suites were run instead, as required by the Sprint brief.
