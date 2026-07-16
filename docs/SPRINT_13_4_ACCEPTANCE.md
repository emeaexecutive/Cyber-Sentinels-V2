# Sprint 13.4 Acceptance

## Validation

- [x] Every decision source is separated into deterministic rules, heuristic logic, provider evidence, ML inference, human-reviewed outcome and simulated evidence.
- [x] The existing Validation Dashboard shows dataset version, ground truth, reviewed samples, precision, recall, false positives, false negatives, calibration state and unknown rate.
- [x] Insufficient evidence renders `Calibration Incomplete`; unavailable metrics are not coerced to zero.
- [x] Dataset schema JSON is excluded from validation-case loading.

## Provider reality

- [x] Provider-facing maturity uses only Live, Test, Awaiting Credentials, Prototype and Disabled.
- [x] Internal timeout/failure telemetry remains separate.
- [x] Hopae is documented and surfaced as the sole production-candidate path.
- [x] The non-executing generic connection-test control was removed.

## UX and enterprise story

- [x] Homepage remains at six sections, two CTAs and one primary graph.
- [x] Homepage copy leads with operational outcomes rather than feature repetition.
- [x] The existing demo route presents one nine-stage journey without buyer-facing decision branches.
- [ ] Screenshot-based desktop/mobile QA was not available because the required in-app browser connection was not exposed in this session; static UX contracts and the production build are the fallback boundary.

## Performance and security

- [x] Replay, Evidence Graph, Trust Decision, provider, database and queue profiles expose average, p95, timeout and slow-operation fields.
- [x] Missing runtime samples remain `Awaiting data`.
- [x] Authentication, authorization, RLS, signatures, secrets, rate limits, replay protection, tenant isolation, provider isolation and audit logging are evidence-mapped.
- [x] Stripe webhook ingress now has request-rate and payload-size boundaries.

## Readiness and delivery

- [x] The existing Enterprise Readiness Center shows eight evidence-linked RC4 categories.
- [x] Required RC4 documentation exists and is available through the existing docs route.
- [x] No new engine or product route was introduced.
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- Repository delivery is verified after this pre-commit acceptance record is finalized: commit with the required message, push `main`, then confirm local/remote synchronization.
