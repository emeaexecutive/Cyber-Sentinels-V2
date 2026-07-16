# Sprint 14.1 Acceptance

## Trust Memory and Evidence Graph

- [x] Why Trust Changed exposes previous/new posture, evidence, authority, policy, reviewer, confidence, reassessment and Replay.
- [x] Trust Memory integrity covers source attribution, policy history and reassessment traceability.
- [x] Evidence Graph exposes weighting, provenance, freshness, relationship strength, contradictions, missing evidence and expiry.
- [x] Evidence Coverage reports Verified, Pending, Missing, Expired and Contradictory per assessment.

## Validation and providers

- [x] Existing Validation Dashboard is the Validation Center; no duplicate route exists.
- [x] Every validation metric uses Live, Test, Estimated or Unavailable.
- [x] Provider Operations uses Production, Sandbox, Awaiting Credentials, Prototype or Disabled.
- [x] Normalized provider health exposes availability, latency, last success, credentials, signals, confidence, error rate and retry state.

## UX, proof and demo

- [x] Homepage has one hero, one operational-trust visual, one comparison and one enterprise CTA.
- [x] Mobile navigation density, containment and accessible controls are improved.
- [ ] Interactive browser viewport QA; the required in-app browser JavaScript bridge was unavailable in this session. Source-level responsive checks and the production build remain covered below.
- [x] Enterprise Proof Pack is downloadable through the existing docs route.
- [x] Demo follows nine linear stages through executive trust report production.

## Performance and API maturity

- [x] Admin diagnostics include Decision Engine, Evidence Graph, Replay, provider normalization, trust profile generation and queue throughput profiles.
- [x] Public API inventory documents schemas, authentication, pagination, version, audit and trace IDs.
- [x] Duplicate registry search POST behavior is removed.

## Quality gates

- [x] `npm run lint` (0 errors; 6 pre-existing warnings remain)
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- Repository delivery is verified after this pre-commit record is finalized.

## Controlled local benchmark snapshot

Environment: local in-process Node test; no database, network provider or production queue. Measurements are not an SLA.

| Operation | Samples | Average | p95 |
| --- | ---: | ---: | ---: |
| Decision Engine | 30 | 0.025 ms | 0.057 ms |
| Evidence Graph | 31 | 0.846 ms | 1.060 ms |
| Replay generation | 30 | 0.975 ms | 0.518 ms |
| Provider normalization | 61 | 0.099 ms | 0.132 ms |
| Trust profile generation | 30 | 0.272 ms | 0.451 ms |
| Queue throughput batch | 1 x 10,000 items | 2.739 ms | 2.739 ms |

## Known blockers

- reviewed ground truth is insufficient for accuracy or calibration claims;
- production provider credentials and successful real health evidence are absent;
- performance evidence remains process-local until representative pilot traffic is captured;
- distributed rate limiting and durable webhook replay/idempotency remain deployment hardening.
- interactive desktop/mobile visual QA remains outstanding because the browser skill bridge was unavailable in this execution environment.
